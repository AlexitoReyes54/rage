import chatroom from './chatroom.html'
import PersistanceChatClient from './src/persistance/sqliteClient';
import { chatController } from './src/controller/ChatMVP';
import type { WebSocketData } from './src/controller/ChatMVP';
import loadAllYmlFiles from './src/lib/loaders';

let actineConections = 0;

function bootstrap() {
	console.log("🚀 Initializing resources...");
	loadAllYmlFiles()

	Bun.serve({
		port: 3001,
		routes: {
			'/': chatroom,
			'/msg': (req, server) => {
				const client = PersistanceChatClient.get_instance();
				const sessionId = crypto.randomUUID();

				client.create_new_session(sessionId, "")
				console.info('New session created', sessionId);

				if (server.upgrade(req, {
					data: { sessionId }
				})) {
					return; // do not return a Response
				}

				return new Response("Upgrade failed", { status: 500 });
			}
		},
		fetch(req) {
			return new Response("Not Found", { status: 404 });
		},
		websocket: {
			data: {} as WebSocketData,
			message(ws, message) {
				chatController.onMessage(ws, message)
			},
			open(ws) {
				actineConections++;
				console.log(`There are currently ${actineConections} users online.`);
			},
			close(ws, code, message) {
				actineConections--;
				console.log(`There are currently ${actineConections} users online.`);
			},
			drain(ws) { }, // the socket is ready to receive more data
		},
	})

	console.log('App running on default port');
}

bootstrap();

