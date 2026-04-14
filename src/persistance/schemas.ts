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

// --- Tables ---

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const organizationMembers = pgTable('organization_members', {
  userId: integer('user_id').references(() => users.id).notNull(),
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
