import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check invites table structure and data
const [invites] = await connection.execute('SELECT id, email, name, status FROM invites ORDER BY id');
console.log('=== Invites Table ===');
console.log(JSON.stringify(invites, null, 2));

// Check if invites have names we can use
const [inviteAssignments] = await connection.execute(`
  SELECT da.id, da.inviteId, da.drillName, i.name as inviteName, i.email
  FROM drillAssignments da
  JOIN invites i ON da.inviteId = i.id
  WHERE da.userId IS NULL AND da.athleteName IS NULL
  LIMIT 10
`);
console.log('\n=== Assignments linked to invites ===');
console.log(JSON.stringify(inviteAssignments, null, 2));

await connection.end();
