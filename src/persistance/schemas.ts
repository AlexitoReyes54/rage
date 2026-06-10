import {
	pgTable,
	serial,
	text,
	timestamp,
	boolean,
	integer,
	pgEnum,
	primaryKey
} from 'drizzle-orm/pg-core';

// --- Enums ---

export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'member']);

export const billingIntervalEnum = pgEnum('billing_interval', ['monthly', 'yearly']);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
	'active',
	'canceled',
	'past_due',
	'trialing'
]);
export const messageRoleEnum = pgEnum('message_role', ['human', 'bot']);
// --- Tables ---

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	phoneNumber: text('phone_number').notNull().unique(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const organizations = pgTable('organizations', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const organizationMembers = pgTable('organization_members', {
	userId: text('user_id').references(() => users.id).notNull(),
	organizationId: integer('organization_id').references(() => organizations.id).notNull(),
	role: memberRoleEnum('role').default('member').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
	pk: primaryKey({ columns: [table.userId, table.organizationId] }),
}));

export const plans = pgTable('plans', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	active: boolean('active').default(true).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const planPricing = pgTable('plan_pricing', {
	id: serial('id').primaryKey(),
	planId: integer('plan_id').references(() => plans.id).notNull(),
	price: integer('price').notNull(), // Stored in cents/smallest unit
	currency: text('currency').default('USD').notNull(),
	interval: billingIntervalEnum('interval').notNull(),
	active: boolean('active').default(true).notNull(),
	messageLimit: integer('message_limit')
		.default(0)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
	id: serial('id').primaryKey(),
	organizationId: integer('organization_id').references(() => organizations.id).notNull(),
	planPricingId: integer('plan_pricing_id').references(() => planPricing.id).notNull(),
	status: subscriptionStatusEnum('status').notNull(),
	startedAt: timestamp('started_at').defaultNow().notNull(),
	currentPeriodEnd: timestamp('current_period_end').notNull(),
	canceledAt: timestamp('canceled_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});


export const conversations = pgTable('conversations', {
	id: serial('id').primaryKey(),
	organizationId: integer('organization_id')
		.references(() => organizations.id)
		.notNull(),
	state: text('content').notNull(),
	clientPhone: text('client_phone_number').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
	id: serial('id').primaryKey(),
	content: text('content').notNull(),
	role: messageRoleEnum('role').notNull(),
	conversationId: integer('conversation_id')
		.references(() => conversations.id, {
			onDelete: 'cascade'
		})
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const configs = pgTable('configs', {
	id: serial('id').primaryKey(),
	organizationId: integer('organization_id')
		.references(() => organizations.id, {
			onDelete: 'cascade'
		})
		.notNull()
		.unique(),
	behavior: text('behavior'),
	extraMessages: integer('extra_messages')
		.default(0)
		.notNull(),
	planMessagesConsumed: integer('plan_messages_consumed')
		.default(0)
		.notNull(),
	isBotOn: boolean('is_bot_on')
		.default(true)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bookings = pgTable('bookings', {
	id: serial('id').primaryKey(),
	description: text('description'),
	date: timestamp({ precision: 6, withTimezone: true }).notNull(),
	// date format:
	// 2026-05-31 14:00:00-04:00
	userId: text('user_id').references(() => users.id).notNull(),
	leadName: text('lead_name'),
	conversationId: integer('conversation_id')
		.references(() => conversations.id, {
			onDelete: 'cascade'
		}).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});
