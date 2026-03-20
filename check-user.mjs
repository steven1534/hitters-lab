import { getDb } from './server/db.ts';
import { users, invites } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

async function check() {
  const db = await getDb();
  if (!db) {
    console.log('DB not available');
    return;
  }
  
  // Find user by email
  const userResult = await db.select().from(users).where(eq(users.email, 'stevengoldstein.pro@gmail.com')).limit(1);
  console.log('User:', JSON.stringify(userResult[0], null, 2));
  
  // Find invite
  const inviteResult = await db.select().from(invites).where(eq(invites.email, 'stevengoldstein.pro@gmail.com')).limit(1);
  console.log('Invite:', JSON.stringify(inviteResult[0], null, 2));
}

check().catch(console.error);
