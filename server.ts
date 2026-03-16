//TODO rename the index file into chatroom.html
import index from './index.html'

const s = Bun.serve({

	routes: {
		'/': index
	},

	fetch(req) {

		return new Response("Not Found", { status: 404 });
	},
})
