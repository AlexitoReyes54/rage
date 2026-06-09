import { Elysia } from 'elysia'
import { html } from '@elysiajs/html';
import { cors } from '@elysiajs/cors'


// html files
const login = Bun.file('./src/views/login.html').text();
const booking = Bun.file('./src/views/booking.html').text();
const error = Bun.file('./src/views/error.html').text();
const chatroom = Bun.file('./chatroom.html').text();

//types for controllers
import { NewUserSchema } from './src/types/newUser';
import type { WhatsAppWebhookBody } from './src/types/whatsapp/whatsappIncomingMsg';
import type { WhatsappIncomingMsg } from './src/types/WhatsappIncomingMsg';

// controllers and utils
import PersistanceChatClient from './src/persistance/sqliteClient';
import { chatController } from './src/controller/ChatMVP';
import { userController } from './src/controller/UserController';
import type { WebSocketData } from './src/controller/ChatMVP';
import loadAllYmlFiles from './src/lib/loaders';

import incomingMessagesWSQueue from './src/queues/incomingMessages';

// firebase related
import * as admin from 'firebase-admin';
import firebase_admin from 'firebase-admin';
import serviceAccount from "./firebase.json";
import { getAuth } from "firebase-admin/auth";
import { bookingSchema } from './src/types/booking';
import { bookingController } from './src/controller/bookingController';

firebase_admin.initializeApp({
	credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const auth = getAuth();


// --- Middleware Wrapper ---
const withAuth = (handler: (req: Request) => Promise<Response> | Response) => {
	return async (req: Request) => {
		try {
			const authHeader = req.headers.get("authorization");
			const idToken = authHeader?.split("Bearer ")[1];
			//console.log(idToken);

			if (!idToken) {
				return Response.json({ error: "Unauthorized: No token" }, { status: 401 });
			}

			// Verify the token
			const decodedToken = await auth.verifyIdToken(idToken);
			console.log(decodedToken.uid);

			// Pass the request to the actual handler
			// You can also attach the user to the request if needed
			return handler(req);
		} catch (error) {
			console.log(error);
			return Response.json({ error: "Unauthorized: Invalid token" }, { status: 403 });
		}
	};
};

const WHATSAPP_VERIFY_TOKEN = "howImet2528-nika";

const app = new Elysia({
	websocket: {
		// TODO this time is for testing, has to be reviewed
		idleTimeout: 200
	}
})

	// All this is for logging
	.derive(({ headers }) => ({
		requestId: headers['x-request-id'] || crypto.randomUUID()
	}))
	.state('startTime', 0)
	.onBeforeHandle(({ store }) => {
		store.startTime = performance.now();
	})
	.onAfterResponse(({ request, path, set, store, requestId, headers }) => {
		const duration = (performance.now() - store.startTime).toFixed(2);

		const log = {
			time: new Date().toISOString(),
			id: requestId,
			method: request.method,
			path: path,
			status: set.status,
			duration: `${duration}ms`,
			ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
			// query: new URL(request.url).searchParams.toString() 
		};

		// In production, we use JSON.stringify so log processors (Datadog/ELK) can parse it.
		console.log(JSON.stringify(log));
	})
	.onError(({ code, error, request, requestId }) => {
		console.error(JSON.stringify({
			time: new Date().toISOString(),
			id: requestId,
			level: 'ERROR',
			code,
			stack: error, // Crucial for debugging production crashes
			path: new URL(request.url).pathname
		}));
	})

	// actual routes
	.use(cors())
	.use(html())

	// endpoints for date booking

	.post('/booking/save', async ({ body }) => {
		try {
			// TODO this is not reporting errrors, to be fixed in the future there is no 
			// way for me to see it in the client
			
			let done = await bookingController.saveBooking(body);
			return Response.json({ created: done, ...body });
		} catch (error) {
			//this needs better detail to know what happened
			return Response.json({ created: false });
		}
	}, { body: bookingSchema })

	.get('/booking/user/:id', async ({ params: { id } }) => {
		let res = await bookingController.getAllBookingFromUser(id);
		return Response.json({ items: res });
	})


	.get('/booking/:id', async ({ params: { id }, html }) => {

		let booking = await Bun.file('./src/views/booking.html').text();
		let isUser = await userController.findUserdById(id);
		if (!isUser) return html(error);

		return html(booking);
	})

	.get('/login', async ({ html }) => html(login))
	// TODO working here my friend
	.get('/t', async () => {

		const data: WhatsappIncomingMsg = {
			textMsg: 'Hello, I need help with my order',
			reciverPhoneNumberID: 'wamid.HBgLMjAyNTU1MDEyMzQ1FQIAERgSODdFQzQ5RkYxQ0E=',
			reciverPhoneNumber: '16505551111',
			sender: {
				userID: 'user_123456',
				phoneNumber: '+18095559876',
			},
			type: 'text',
			timestamp: ''
		};

		await incomingMessagesWSQueue.add('incomingMessages', data)
		return 'ok'
	})
	.get('/', async ({ html }) => html(chatroom))
	// whatsapp webhook
	.get('/webhook', ({ query, set }) => {
		const mode = query["hub.mode"];
		const token = query["hub.verify_token"];
		const challenge = query["hub.challenge"];

		if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
			console.log("✅ Webhook verificado con éxito");
			return challenge;
		}

		set.status = 403;
		return "Error de verificación";
	})

	.post('/webhook', async (all) => {
		let body = all.body as WhatsAppWebhookBody;
		console.log(body.entry[0]?.changes);

		if (body.object !== "whatsapp_business_account") {
			return 'ok';
		}

		for (const entry of body.entry) {
			for (const change of entry.changes) {

				if (change.field !== "messages") continue;

				const { messages, contacts, metadata } = change.value;

				for (const message of messages) {

					const data: WhatsappIncomingMsg = {
						textMsg: message.text?.body || '',
						reciverPhoneNumberID: metadata.phone_number_id,
						reciverPhoneNumber: metadata.display_phone_number,
						sender: {
							userID: message.from_user_id,
							phoneNumber: message.from
						},
						type: 'text',
						timestamp: message.timestamp
					}

					console.log("Procesando mensaje:", data);
					await incomingMessagesWSQueue.add('incomingMessages', data)
				}
			}
		}


		return 'ok';
	})

	// protected routes
	.guard(
		{
			beforeHandle({ set, cookie: { session }, status }) {
				console.log('protect');
				// if not user then rejectd
				return status(401)
			}
		},
		(app) =>
			app.get('/dashboard', async ({ html }) => 'dashboard')
	)


	.post('/api/user', async ({ body }) => {
		try {
			let done = await userController.createNewUser(body); return Response.json({ created: done, ...body });
		} catch (error) {
			//this needs better detail to know what happened
			return Response.json({ created: false });
		}
	}, { body: NewUserSchema })

	.ws('/msg', {
		open(ws) {
			const client = PersistanceChatClient.get_instance();
			const sessionId = ws.id;

			client.create_new_session(sessionId, "");
			console.info('New session created', sessionId);
		},
		message(ws, { message }) {
			// i need to call the controlller here 
			//chatController.onMessage(ws, message)

			ws.send({
				type: "msg",
				code: 500,
				text: ws.id,
				timestamp: new Date().toISOString()
			})
		},
		close(ws) {
			console.info('Session closed', ws.id);
		}
	})
	.onStart(() => {
		console.log("🚀 Initializing resources...");
		loadAllYmlFiles()
	})
	.listen(3001);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
