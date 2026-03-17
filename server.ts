import chatroom from './chatroom.html'

const s = Bun.serve({
	routes: {
		'/': chatroom
	},
	fetch(req) {
		return new Response("Not Found", { status: 404 });
	},
})

console.log('app running');

