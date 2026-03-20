import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';

const DB_URL = 'postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres';
const sql = postgres(DB_URL, { ssl: 'require', prepare: false });

const HASH = process.env.PW_HASH;

// Check current user
const users = await sql`SELECT id, email, name, role FROM users WHERE email = 'coach@coachstevebaseball.com'`;
console.log('Current user:', JSON.stringify(users, null, 2));

// Update password and ensure admin role
const result = await sql`
  UPDATE users 
  SET password_hash = ${HASH}, role = 'admin'
  WHERE email = 'coach@coachstevebaseball.com' 
  RETURNING id, email, name, role
`;
console.log('Updated:', JSON.stringify(result, null, 2));

await sql.end();
