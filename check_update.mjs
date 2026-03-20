import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check NULL count
const [nullCount] = await connection.execute('SELECT COUNT(*) as count FROM athleteActivity WHERE athleteName IS NULL');
console.log('NULL athleteName count:', nullCount[0].count);

// Check total count
const [totalCount] = await connection.execute('SELECT COUNT(*) as count FROM athleteActivity');
console.log('Total records:', totalCount[0].count);

// Sample of records with names
const [sample] = await connection.execute('SELECT athleteId, athleteName, activityType FROM athleteActivity WHERE athleteName IS NOT NULL LIMIT 10');
console.log('\nSample records with names:');
console.log(JSON.stringify(sample, null, 2));

// Check if there are any athleteIds that don't match users
const [unmatchedIds] = await connection.execute(`
  SELECT DISTINCT a.athleteId 
  FROM athleteActivity a 
  LEFT JOIN users u ON a.athleteId = u.id 
  WHERE u.id IS NULL
`);
console.log('\nUnmatched athlete IDs (not in users table):');
console.log(JSON.stringify(unmatchedIds, null, 2));

await connection.end();
