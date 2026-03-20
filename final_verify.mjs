import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const tables = [
  { name: 'athleteActivity', nameCol: 'athleteName' },
  { name: 'coachNotes', nameCol: 'athleteName' },
  { name: 'drillQuestions', nameCol: 'athleteName' },
  { name: 'weeklyGoals', nameCol: 'athleteName' },
  { name: 'drillAssignments', nameCol: 'athleteName' },
  { name: 'drillSubmissions', nameCol: 'athleteName' },
  { name: 'badges', nameCol: 'athleteName' },
  { name: 'pendingEmailAlerts', nameCol: 'athleteName' },
];

console.log('=== Final Verification ===\n');
console.log('Table                    | Total | With Name | NULL');
console.log('-------------------------|-------|-----------|-----');

for (const table of tables) {
  try {
    const [total] = await connection.execute(`SELECT COUNT(*) as count FROM ${table.name}`);
    const [withName] = await connection.execute(`SELECT COUNT(*) as count FROM ${table.name} WHERE ${table.nameCol} IS NOT NULL`);
    const [nullName] = await connection.execute(`SELECT COUNT(*) as count FROM ${table.name} WHERE ${table.nameCol} IS NULL`);
    
    console.log(`${table.name.padEnd(24)} | ${String(total[0].count).padStart(5)} | ${String(withName[0].count).padStart(9)} | ${String(nullName[0].count).padStart(4)}`);
  } catch (e) {
    console.log(`${table.name.padEnd(24)} | Error: ${e.message}`);
  }
}

await connection.end();
