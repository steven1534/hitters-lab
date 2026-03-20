import postgres from 'postgres';

const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require',
  prepare: false,
});

// 1. Link Shannon Caputo (blastPlayers id='1') to her portal account (userId=101400188)
const shannon = await sql`UPDATE "blastPlayers" SET "userId" = 101400188 WHERE id = '1' RETURNING "fullName", "userId"`;
console.log("Linked Shannon:", shannon);

// 2. Delete Jasper Tirro (blastPlayers id='759bdec7-e12c-4e29-9778-d7c72570f113') and her sessions/metrics
const jasperSessions = await sql`SELECT id FROM "blastSessions" WHERE "playerId" = '759bdec7-e12c-4e29-9778-d7c72570f113'`;
console.log("Jasper sessions to delete:", jasperSessions.length);
for (const s of jasperSessions) {
  await sql`DELETE FROM "blastMetrics" WHERE "sessionId" = ${s.id}`;
}
await sql`DELETE FROM "blastSessions" WHERE "playerId" = '759bdec7-e12c-4e29-9778-d7c72570f113'`;
await sql`DELETE FROM "blastPlayers" WHERE id = '759bdec7-e12c-4e29-9778-d7c72570f113'`;
console.log("Deleted Jasper Tirro blast player + sessions");

// 3. Delete Steven G (blastPlayers id='10') and his sessions/metrics
const stevenSessions = await sql`SELECT id FROM "blastSessions" WHERE "playerId" = '10'`;
console.log("Steven G sessions to delete:", stevenSessions.length);
for (const s of stevenSessions) {
  await sql`DELETE FROM "blastMetrics" WHERE "sessionId" = ${s.id}`;
}
await sql`DELETE FROM "blastSessions" WHERE "playerId" = '10'`;
await sql`DELETE FROM "blastPlayers" WHERE id = '10'`;
console.log("Deleted Steven G blast player + sessions");

// Verify final state
console.log("\n=== Final blastPlayers ===");
const final = await sql`SELECT id, "fullName", "userId" FROM "blastPlayers" ORDER BY "fullName"`;
console.table(final);

await sql.end();
