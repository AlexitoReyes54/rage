import { Worker, Job } from 'bullmq';
import type { WhatsappIncomingMsg } from '../types/WhatsappIncomingMsg';
import { db } from '../persistance/postgresClient';
import { users, organizationMembers, planPricing, subscriptions, configs } from '../persistance/schemas';
import outgoingMessagesWSQueue from '../queues/outgoingMessages';

import { eq } from 'drizzle-orm';

const conection_obj = {
	host: process.env.REDIS_URL as string,
	port: Number(process.env.REDIS_PORT as string),
}

export const incomingMessageWsWorker = new Worker<WhatsappIncomingMsg>('incomingMessagesWS', async (job: Job<WhatsappIncomingMsg>) => {
	const data = job.data;

	if (data.textMsg === '' || data.textMsg.length < 2) {
		return
		// exit the flow
	}

	let u = await db
		.select({
			// user
			id: users.id,
			name: users.name,
			ownerPhonehumber: users.phoneNumber,

			// organization
			organizationId: organizationMembers.organizationId,

			// subscription
			subscriptionId: subscriptions.id,
			subscriptionStatus: subscriptions.status,
			subscriptionStartedAt: subscriptions.startedAt,
			subscriptionCurrentPeriodEnd: subscriptions.currentPeriodEnd,
			canceledAt: subscriptions.canceledAt,

			// plan pricing
			planPricingId: planPricing.id,
			price: planPricing.price,
			currency: planPricing.currency,
			interval: planPricing.interval,
			messageLimit: planPricing.messageLimit,
			planActive: planPricing.active,

			// config
			configId: configs.id,
			behavior: configs.behavior,
			extraMessages: configs.extraMessages,
			planMessagesConsumed: configs.planMessagesConsumed,
			isBotOn: configs.isBotOn,
		})
		.from(users)
		.innerJoin(
			organizationMembers,
			eq(users.id, organizationMembers.userId)
		)
		.innerJoin(
			subscriptions,
			eq(
				organizationMembers.organizationId,
				subscriptions.organizationId
			)
		)
		.innerJoin(
			planPricing,
			eq(subscriptions.planPricingId, planPricing.id)
		)
		.innerJoin(
			configs,
			eq(
				organizationMembers.organizationId,
				configs.organizationId
			)
		)
		.where(eq(users.phoneNumber, data.reciverPhoneNumber));

	console.log(u);
	let userResult = u[0];

	// all filters to make stop the flow

	// user dont exist
	if (!userResult) {
		return
	}

	// no active subscriptionStatus
	if (userResult.subscriptionStatus !== 'active') {
		return
	}

	// bot is off
	if (!userResult.isBotOn) {
		return
	}

	// limit of msgs
	if (userResult.planMessagesConsumed >= userResult.messageLimit + userResult.extraMessages) {
		return
	}

	// important dont make any change here, dont write on any data here 

	//TODO behavior from config is to be implemented here
	//TODO implement the chat recovery and then run the engine execution
	
}, {
	connection: conection_obj
});


// Add these for visibility:
incomingMessageWsWorker.on('completed', async (job) => {
	console.log(`${job.id} has completed!`);
	await outgoingMessagesWSQueue.add('outgoingMessages', {})
});

incomingMessageWsWorker.on('failed', (job, err) => {
	console.error(`${job?.id} has failed with ${err.message}`);
});

incomingMessageWsWorker.on('error', (err) => {
	console.error("Worker connection error:", err);
});

