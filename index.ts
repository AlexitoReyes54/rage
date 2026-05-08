import { Queue } from 'bullmq';
import { Worker, Job } from 'bullmq';

// constant
let conection_obj = {
	host: 'localhost',
	port: 6379,
}

// defines queue
const myQueue = new Queue('foo', {
	connection: conection_obj
});

// worker
const worker = new Worker('foo', async (job: Job) => {
	console.log('we are working');
}, {
	connection: conection_obj
});


async function addJobs() {
	await myQueue.add('myJobName', { foo: 'bar' });
	await myQueue.add('myJobName', { qux: 'baz' });
}

async function run() {
	await addJobs()	;
}

run()
