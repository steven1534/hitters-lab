import postgres from 'postgres';
const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require', prepare: false,
});

// Check current max id and sequence value
const maxId = await sql`SELECT MAX(id) as max_id FROM "blastMetrics"`;
console.log('Max id in blastMetrics:', maxId[0].max_id);

const seqVal = await sql`SELECT last_value FROM "blastMetrics_id_seq"`;
console.log('Current sequence value:', seqVal[0].last_value);

// Reset sequence to be safe
await sql`SELECT setval('"blastMetrics_id_seq"', GREATEST((SELECT MAX(id) FROM "blastMetrics"), 1))`;
console.log('Sequence reset to max id.');

// Test insert
const test = await sql`
  INSERT INTO "blastMetrics" ("sessionId", "batSpeedMph") 
  VALUES ('test-check-123', '50') 
  RETURNING id
`;
console.log('Test insert succeeded, id:', test[0].id);

// Clean up test row
await sql`DELETE FROM "blastMetrics" WHERE "sessionId" = 'test-check-123'`;
console.log('Test row cleaned up. All good!');

await sql.end();
