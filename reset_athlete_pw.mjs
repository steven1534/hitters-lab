import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require', prepare: false,
});

const hash = await bcrypt.hash('player123', 10);
const result = await sql`UPDATE users SET "passwordHash" = ${hash} WHERE role = 'athlete'`;
console.log(`Updated ${result.count} athlete passwords to: player123`);

await sql.end();
