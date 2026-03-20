import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const drills = JSON.parse(readFileSync('./client/src/data/drills.json', 'utf-8'));

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.query('SELECT drillId, videoUrl FROM drillVideos');
const inDb = new Set(rows.map(r => r.drillId));
const jsonIds = new Set(drills.map(d => d.id));

const missing = drills.filter(d => !inDb.has(d.id));
const extra = rows.filter(r => !jsonIds.has(r.drillId));

console.log('Drills in JSON:', drills.length);
console.log('Drills in drillVideos table:', inDb.size);
console.log('Drills missing from drillVideos:', missing.length);

if (missing.length > 0) {
  console.log('\nMissing drills (first 20):');
  missing.slice(0, 20).forEach(d => console.log(' -', d.id, '|', d.name));
}

console.log('\nDrillVideos entries NOT in drills.json:', extra.length);
if (extra.length > 0) {
  console.log('\nExtra entries (first 10):');
  extra.slice(0, 10).forEach(r => console.log(' -', r.drillId, '|', r.videoUrl.substring(0, 60)));
}

// Show a few video URLs to understand the format
console.log('\nSample video URLs:');
rows.slice(0, 5).forEach(r => console.log(' -', r.drillId, ':', r.videoUrl));

await conn.end();
