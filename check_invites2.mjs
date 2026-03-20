import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check invites table structure
const [columns] = await connection.execute('DESCRIBE invites');
console.log('=== Invites Table Columns ===');
console.log(JSON.stringify(columns, null, 2));

// Get sample invites data
const [invites] = await connection.execute('SELECT * FROM invites LIMIT 5');
console.log('\n=== Sample Invites ===');
console.log(JSON.stringify(invites, null, 2));

await connection.end();
