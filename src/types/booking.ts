import { z } from "zod";

export const bookingSchema = z.object({
	id: z.string(),
	date: z.string(),
	userId: z.string(),
	conversationID: z.number(),
	description: z.string().optional(),
	leadName: z.string().optional(),
});

export type BookingSchema = z.infer<typeof bookingSchema>;
