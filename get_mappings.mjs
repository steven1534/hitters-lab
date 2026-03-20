import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Get all user ID to name mappings from users table
const [users] = await connection.execute('SELECT id, name, email FROM users ORDER BY id');
console.log('=== Users Table ===');
console.log(JSON.stringify(users, null, 2));

// Get the manually entered athleteName mappings from athleteActivity
const [activityMappings] = await connection.execute('SELECT DISTINCT athleteId, athleteName FROM athleteActivity WHERE athleteName IS NOT NULL ORDER BY athleteId');
console.log('\n=== Activity Mappings (manually entered) ===');
console.log(JSON.stringify(activityMappings, null, 2));

// Get count of NULL athleteName records
const [nullCount] = await connection.execute('SELECT COUNT(*) as count FROM athleteActivity WHERE athleteName IS NULL');
console.log('\n=== NULL athleteName count ===');
console.log(JSON.stringify(nullCount, null, 2));

await connection.end();
