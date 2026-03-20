import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Get unique inviteIds from drillAssignments with NULL athleteName
const [missingInvites] = await connection.execute(`
  SELECT DISTINCT da.inviteId, i.email, i.status
  FROM drillAssignments da
  LEFT JOIN invites i ON da.inviteId = i.id
  WHERE da.athleteName IS NULL
`);
console.log('=== Invite IDs with NULL athleteName ===');
console.log(JSON.stringify(missingInvites, null, 2));

// Check if these emails exist in users table
for (const inv of missingInvites) {
  if (inv.email) {
    const [user] = await connection.execute('SELECT id, name FROM users WHERE email = ?', [inv.email]);
    console.log(`\nEmail: ${inv.email}`);
    console.log('User match:', user.length > 0 ? user[0] : 'No match');
  }
}

await connection.end();
