import { drizzle } from 'drizzle-orm/node-postgres';
import { users, organizations, organizationMembers } from './../persistance/schemas';
import type { NewUser } from '../types/newUser';

const db = drizzle(process.env.DATABASE_URL!);

class UserController {

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
