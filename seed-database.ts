
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
  
const db = drizzle(process.env.DATABASE_URL!);

async function main() {
}

main();
