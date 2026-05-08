import { z } from "zod";

export const NewUserSchema = z.object({
	uid: z.string(),
	userName: z.string(),
	email: z.string(),
	phoneNumber: z.string(),
});

export type NewUser = z.infer<typeof NewUserSchema>;
