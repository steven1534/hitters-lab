import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Get invites with their associated user names (via acceptedByUserId or email match)
const [inviteUsers] = await connection.execute(`
  SELECT i.id as inviteId, u.name as userName, i.email
  FROM invites i
  LEFT JOIN users u ON i.acceptedByUserId = u.id OR i.email = u.email
  WHERE u.name IS NOT NULL
`);
console.log('=== Invites with user names ===');
console.log(JSON.stringify(inviteUsers, null, 2));

// Update drillAssignments with names from invites
const [result] = await connection.execute(`
  UPDATE drillAssignments da
  JOIN invites i ON da.inviteId = i.id
  LEFT JOIN users u ON i.acceptedByUserId = u.id OR i.email = u.email
  SET da.athleteName = u.name
  WHERE da.athleteName IS NULL AND u.name IS NOT NULL
`);
console.log('\n=== Update result ===');
console.log('Rows affected:', result.affectedRows);

// Check remaining NULL athleteNames in drillAssignments
const [remaining] = await connection.execute(`
  SELECT COUNT(*) as count FROM drillAssignments WHERE athleteName IS NULL
`);
console.log('\nRemaining NULL athleteNames:', remaining[0].count);

await connection.end();
