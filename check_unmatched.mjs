import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Check activities for unmatched IDs
const [unmatched] = await connection.execute(`
  SELECT athleteId, athleteName, activityType, createdAt 
  FROM athleteActivity 
  WHERE athleteId IN (5340246, 5130419)
  ORDER BY athleteId, createdAt
`);
console.log('Activities for unmatched IDs:');
console.log(JSON.stringify(unmatched, null, 2));

await connection.end();
