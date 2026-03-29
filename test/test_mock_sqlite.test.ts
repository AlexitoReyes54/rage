import PersistanceChatClient from "./../src/persistance/sqliteClient"; // adjust path as needed
import { unlinkSync, existsSync } from "node:fs";

async function runTest() {
	console.log("🚀 Starting PersistenceChatClient Validation...");

	// 0. Optional: Wipe existing test DB to start fresh
	const dbFile = "chat.sqlite";
	if (existsSync(dbFile)) {
		unlinkSync(dbFile);
		console.log("🧹 Cleaned up old database file.");
	}

	// 1. Get Instance (Singleton check)
	const client = PersistanceChatClient.get_instance();
	const sessionId = crypto.randomUUID();
	const sessionName = "Test AI Conversation";

	// 2. Test: Create Session
	console.log(`\n--- Testing Session Creation ---`);
	client.create_new_session(sessionId, sessionName);

	const exists = client.session_exists(sessionId);
	const sessionData = client.get_session(sessionId);

	console.log(`Session Exists: ${exists ? "✅" : "❌"}`);
	console.log(`Session Name Match: ${sessionData?.name === sessionName ? "✅" : "❌"}`);

	// 3. Test: Save Messages
	console.log(`\n--- Testing Message Persistence ---`);
	client.save_msg(sessionId, "Hello! I am the user.", 1); // Human
	client.save_msg(sessionId, "Hello! I am the AI assistant.", 0); // AI
	client.save_msg(sessionId, "How is the weather today?", 1); // Human

	// 4. Test: Retrieve and Validate Messages
	const messages = client.get_all_session_msgs(sessionId);

	console.log(`Messages Retrieved: ${messages.length}`);
	if (messages.length === 3) {
		console.log("Message Count: ✅");
	} else {
		console.log("Message Count: ❌");
	}

	// Log the data to see the types
	console.log("\nSample Message Structure:");
	console.table(messages);

	// 5. Validation Logic
	const firstMsg = messages[0];
	if (typeof firstMsg.is_human === "number" && typeof firstMsg.timestamp === "string") {
		console.log("\nData Types (SQLite compatibility): ✅");
	}

	console.log("\n🏁 Validation Complete.");
}

// Run the test
// diable this test is not needed any more
//runTest().catch(console.error);
