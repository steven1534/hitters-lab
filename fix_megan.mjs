import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';
const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', { ssl: 'require', prepare: false });

// Get both users first
const megan = await sql`SELECT id, email, name, role FROM users WHERE email = 'caputomegan@yahoo.com'`;
const shannon = await sql`SELECT id, email, name, role FROM users WHERE email = 'shannoncaputo70@gmail.com'`;
console.log('Megan:', megan[0]);
console.log('Shannon:', shannon[0]);

if (!megan[0] || !shannon[0]) { console.log('ERROR: Could not find one or both users'); process.exit(1); }

// Fix Megan's name and set role to parent
await sql`UPDATE users SET name = 'Megan Caputo', role = 'parent' WHERE id = ${megan[0].id}`;

// Link Megan as Shannon's parent
await sql`UPDATE users SET "parentId" = ${megan[0].id} WHERE id = ${shannon[0].id}`;

// Verify
const check = await sql`SELECT id, email, name, role, "parentId" FROM users WHERE id IN (${megan[0].id}, ${shannon[0].id})`;
console.log('After update:', check);

await sql.end();
