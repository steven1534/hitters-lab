import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Get all tables
const [tables] = await connection.execute(`
  SELECT TABLE_NAME 
  FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA = DATABASE()
`);

console.log('=== All Tables ===');
for (const table of tables) {
  console.log(table.TABLE_NAME);
}

// Find columns that might reference athletes (userId, athleteId, etc.)
const [columns] = await connection.execute(`
  SELECT TABLE_NAME, COLUMN_NAME 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND (COLUMN_NAME LIKE '%athleteId%' OR COLUMN_NAME LIKE '%userId%' OR COLUMN_NAME LIKE '%athleteName%')
  ORDER BY TABLE_NAME, COLUMN_NAME
`);

console.log('\n=== Tables with athlete/user ID columns ===');
console.log(JSON.stringify(columns, null, 2));

await connection.end();
