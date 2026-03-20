import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require', prepare: false,
});

const hash = await bcrypt.hash('admin123', 10);
await sql`UPDATE users SET "passwordHash" = ${hash} WHERE email = 'coach@coachstevebaseball.com'`;
console.log('Updated admin password to: admin123');

await sql.end();
