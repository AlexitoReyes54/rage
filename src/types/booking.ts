
import { z } from "zod";

export const bookingSchema = z.object({
	id: z.string(),
	description: z.string(),
	date: z.string(),
	userId: z.string(),
});

export type BookingSchema = z.infer<typeof bookingSchema>;
