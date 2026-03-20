import postgres from 'postgres';
const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require', prepare: false,
});

const users = await sql`SELECT id, email, name, "passwordHash" FROM users WHERE role = 'athlete' ORDER BY name`;
console.table(users.map(u => ({ name: u.name, email: u.email, hash_preview: u.passwordHash?.substring(0, 30) + '...' })));

await sql.end();
