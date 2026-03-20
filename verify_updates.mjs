import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const tables = [
  { name: 'athleteActivity', idCol: 'athleteId', nameCol: 'athleteName' },
  { name: 'coachNotes', idCol: 'athleteId', nameCol: 'athleteName' },
  { name: 'drillQuestions', idCol: 'athleteId', nameCol: 'athleteName' },
  { name: 'weeklyGoals', idCol: 'athleteId', nameCol: 'athleteName' },
  { name: 'drillAssignments', idCol: 'userId', nameCol: 'athleteName' },
  { name: 'drillSubmissions', idCol: 'userId', nameCol: 'athleteName' },
  { name: 'badges', idCol: 'userId', nameCol: 'athleteName' },
  { name: 'pendingEmailAlerts', idCol: 'athleteId', nameCol: 'athleteName' },
];

console.log('=== Verification Results ===\n');

for (const table of tables) {
  try {
    const [total] = await connection.execute(`SELECT COUNT(*) as count FROM ${table.name}`);
    const [withName] = await connection.execute(`SELECT COUNT(*) as count FROM ${table.name} WHERE ${table.nameCol} IS NOT NULL`);
    const [nullName] = await connection.execute(`SELECT COUNT(*) as count FROM ${table.name} WHERE ${table.nameCol} IS NULL`);
    
    console.log(`${table.name}:`);
    console.log(`  Total records: ${total[0].count}`);
    console.log(`  With name: ${withName[0].count}`);
    console.log(`  NULL name: ${nullName[0].count}`);
    console.log('');
  } catch (e) {
    console.log(`${table.name}: Error - ${e.message}\n`);
  }
}

// Sample from athleteActivity to verify
const [sample] = await connection.execute('SELECT athleteId, athleteName, activityType FROM athleteActivity LIMIT 5');
console.log('=== Sample from athleteActivity ===');
console.log(JSON.stringify(sample, null, 2));

// Sample from drillAssignments to verify
const [assignmentSample] = await connection.execute('SELECT userId, athleteName, drillName FROM drillAssignments LIMIT 5');
console.log('\n=== Sample from drillAssignments ===');
console.log(JSON.stringify(assignmentSample, null, 2));

await connection.end();
