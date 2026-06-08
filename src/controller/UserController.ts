import { drizzle } from 'drizzle-orm/node-postgres';
import { users, organizations, organizationMembers } from './../persistance/schemas';
import type { NewUser } from '../types/newUser';
import { eq } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL!);

class UserController {

	async findUserdById(id: string) {
		try {
			let returnedUser = await db.select().from(users).where(eq(users.id, id))
			console.log(returnedUser);
			if (returnedUser.length < 1) return false;
			return true;
		} catch (error) {
			console.error('error while trying to find uuser in the database: ' + error)
			return false;
		}
	}

	async createNewUser(data: NewUser) {

		try {

			const user: typeof users.$inferInsert = {
				name: data.userName,
				id: data.uid,
				email: data.email,
				phoneNumber: data.phoneNumber,
			};

			const personal_organization: typeof organizations.$inferInsert = {
				name: 'personal',
			};

			await db.insert(users).values(user);
			const saved_org = await db.insert(organizations).values(personal_organization).returning({ id: organizations.id });

			const org_id = saved_org[0]?.id;
			if (!org_id) return false;

			const user_organization_relation: typeof organizationMembers.$inferInsert = {
				userId: data.uid,
				organizationId: org_id,
				role: 'owner'
			};

			await db.insert(organizationMembers).values(user_organization_relation);

			return true;
		} catch (a) {
			console.log(a);
			// report error and then send a false msg 
			// TODO implement error and reporting in case something happends 
			return false;
		}
	}
}

export const userController = new UserController();
