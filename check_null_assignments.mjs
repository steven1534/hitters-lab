import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check drillAssignments with NULL userId - these might be invite-based assignments
const [nullAssignments] = await connection.execute(`
  SELECT da.id, da.userId, da.inviteId, da.drillName, i.email as inviteEmail
  FROM drillAssignments da
  LEFT JOIN invites i ON da.inviteId = i.id
  WHERE da.userId IS NULL
  LIMIT 10
`);
console.log('=== drillAssignments with NULL userId ===');
console.log(JSON.stringify(nullAssignments, null, 2));

// Check coachNotes with NULL athleteName
const [nullNotes] = await connection.execute(`
  SELECT cn.id, cn.athleteId, cn.athleteName, cn.note
  FROM coachNotes cn
  WHERE cn.athleteName IS NULL
`);
console.log('\n=== coachNotes with NULL athleteName ===');
console.log(JSON.stringify(nullNotes, null, 2));

// Check drillQuestions with NULL athleteName
const [nullQuestions] = await connection.execute(`
  SELECT dq.id, dq.athleteId, dq.athleteName, dq.question
  FROM drillQuestions dq
  WHERE dq.athleteName IS NULL
`);
console.log('\n=== drillQuestions with NULL athleteName ===');
console.log(JSON.stringify(nullQuestions, null, 2));

// Check drillSubmissions with NULL athleteName
const [nullSubmissions] = await connection.execute(`
  SELECT ds.id, ds.userId, ds.athleteName, ds.drillId
  FROM drillSubmissions ds
  WHERE ds.athleteName IS NULL
`);
console.log('\n=== drillSubmissions with NULL athleteName ===');
console.log(JSON.stringify(nullSubmissions, null, 2));

await connection.end();
