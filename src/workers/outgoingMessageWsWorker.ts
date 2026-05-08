import { Worker, Job } from 'bullmq';
import type { WhatsappOutgoingMsg } from '../types/WhatsappOutgoingMsg';

const conection_obj = {
	host: process.env.REDIS_URL as string,
	port: Number(process.env.REDIS_PORT as string),
};

export const outgoingMessageWsWorker = new Worker<WhatsappOutgoingMsg>(
	'outgoingMessagesWS',
	async (job: Job<WhatsappOutgoingMsg>) => {
		const data = job.data;

		console.log('end game');

		// TODO implement outgoing message processor here
		//
		// examples:
		// - send msg to meta api
		// - retry logic
		// - save outgoing msg to db
		// - increment consumed msgs
		// - handle delivery status
		
	},
	{
		connection: conection_obj,

		limiter: {
			max: 60,
			duration: 60 * 1000,
		},
	}
);

// Add these for visibility:
outgoingMessageWsWorker.on('completed', (job) => {
	console.log(`${job.id} has completed!`);
});

outgoingMessageWsWorker.on('failed', (job, err) => {
	console.error(`${job?.id} has failed with ${err.message}`);
});

outgoingMessageWsWorker.on('error', (err) => {
	console.error('Worker connection error:', err);
});
