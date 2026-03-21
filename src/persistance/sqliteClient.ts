import { Database } from "bun:sqlite";

let setUp_queries = [
	`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT
  )
  `,
	`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    text TEXT,
    is_human BOOLEAN NOT NULL CHECK (is_human IN (0, 1)),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  )
  `
];

export interface Session {
	id: string;
	name: string;
}

export interface Message {
	id: number;
	text: string;
	/** * Represented as 1 for true (Human) and 0 for false (AI) 
	 */
	is_human: 0 | 1;
	/** * ISO 8601 string format (e.g., "2026-03-18 13:15:00")
	 */
	timestamp: string;
}

class PersistanceChatClient {
	private database: Database;
	private static instance: PersistanceChatClient | null;

	private constructor() {
		this.database = new Database("chat.sqlite", { create: true });
		setUp_queries.forEach(query => this.database.run(query));
	}

	static get_instance() {
		if (!this.instance) {
			this.instance = new PersistanceChatClient();
		}
		return this.instance;
	}

	create_new_session(id: string, name: string) {
		const insertSession = this.database.prepare("INSERT INTO sessions (id, name) VALUES ($id, $name)");
		insertSession.run({ $id: id, $name: name });
	}

	get_session(session_id: string): Session | undefined | null {
		const query = this.database.query<Session, { $id: string }>(` SELECT id, name FROM sessions WHERE id = $id LIMIT 1`);
		return query.get({ $id: session_id });
	}

	session_exists(session_id: string): boolean {
		return !!this.get_session(session_id);
	}

	save_msg(session_id: string, msg: string, is_human: 1 | 0) {
		const insertMessage = this.database.prepare(` INSERT INTO messages (session_id, text, is_human) VALUES (?1, ?2, ?3)`);
		insertMessage.run(session_id, msg, is_human);
	}

	get_all_session_msgs(session_id: string) {
		const getMessagesBySession = this.database.query<Message, { $session_id: string }>(`
  SELECT id, text, is_human, timestamp 
  FROM messages 
  WHERE session_id = $session_id
  ORDER BY timestamp ASC
`);
		const messages = getMessagesBySession.all({ $session_id: session_id });
		if (messages.length === 0) return [];
		return messages;
	}

}

export default PersistanceChatClient;

