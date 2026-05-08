import { Queue } from 'bullmq';
import type { WhatsappIncomingMsg } from '../types/WhatsappIncomingMsg';
import '../workers/incomingMessageWsWorker';

const conection_obj = {
	host: process.env.REDIS_URL as string,
	port: Number(process.env.REDIS_PORT as string),
}

const incomingMessagesWSQueue = new Queue<WhatsappIncomingMsg>('incomingMessagesWS', {
	connection: conection_obj
});

export default incomingMessagesWSQueue;

