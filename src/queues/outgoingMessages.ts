import { Queue } from 'bullmq';
//import type { WhatsappOutgoingMsg } from '../types/WhatsappOutgoingMsg';
import '../workers/outgoingMessageWsWorker';

const conection_obj = {
	host: process.env.REDIS_URL as string,
	port: Number(process.env.REDIS_PORT as string),
};

const outgoingMessagesWSQueue = new Queue<any>(
	'outgoingMessagesWS',
	{
		connection: conection_obj,
	}
);

export default outgoingMessagesWSQueue;
