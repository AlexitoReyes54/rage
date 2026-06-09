
import { drizzle } from 'drizzle-orm/node-postgres';
import { bookings } from './../persistance/schemas';
import type { BookingSchema } from '../types/booking';
import { eq } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL!);

// ia generated
// this has to validta is ISO 8601 string for dates
function isDateStringValid(dateStr: string) {
	// 1. Regex validates the exact format: YYYY-MM-DDTHH:mm:ss.sssZ
	const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

	if (!iso8601Regex.test(dateStr)) {
		console.error(`Invalid format: "${dateStr}" must match YYYY-MM-DDTHH:mm:ss.sssZ`);
		return false;
	}

	// 2. Validate it's a real calendar day (e.g., rejects 2026-02-31)
	const timestamp = Date.parse(dateStr);
	if (isNaN(timestamp)) {
		console.error(`Invalid date: "${dateStr}" is not a valid calendar date.`);
		return false;
	}

	return true;
}


class BookingController {

	async saveBooking(data: BookingSchema) {
		try {

			if (!isDateStringValid(data.date)) {
				// exit the controller report error
				console.log('error on validating booking date');
				return false;
			}

			const booking: typeof bookings.$inferInsert = {
				userId: data.userId,
				date: new Date(data.date),
				description: data.description
			};

			await db.insert(bookings).values(booking);
			return true;
		} catch (error) {
			// there is a error tell the endpoint somehow
			console.log('error saving to the database');
			return false
		}
	}

	async getAllBookingFromUser(userId: string) {
		try {
			//TODO validate the userId is correct, or just let if fail

			const res = await db.select()
				.from(bookings)
				.where(eq(bookings.userId, userId))

			return res;
		} catch (error) {
			// there is a error tell the endpoint somehow
			return null;
		}
	}
}

export const bookingController = new BookingController();
