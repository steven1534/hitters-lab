import postgres from 'postgres';
const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require', prepare: false,
});

await sql`DELETE FROM "blastMetrics" WHERE "sessionId" = 'b2fea19b-2d9d-4583-8db9-970bdb7b0fc7'`;
await sql`DELETE FROM "sessionNotes" WHERE "blastSessionId" = 'b2fea19b-2d9d-4583-8db9-970bdb7b0fc7'`;
await sql`DELETE FROM "blastSessions" WHERE id = 'b2fea19b-2d9d-4583-8db9-970bdb7b0fc7'`;
console.log("Deleted empty session for Sean Jaeger.");

await sql.end();
