import { z } from "zod";

export const bookingSchema = z.object({
	id: z.string(),
	date: z.string(),
	userId: z.string(),
	description: z.string().optional(),
	conversationID: z.number(),
	leadName: z.string().optional(),
});

export type BookingSchema = z.infer<typeof bookingSchema>;
