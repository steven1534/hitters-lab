import postgres from 'postgres';
const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require', prepare: false,
});

await sql`
  CREATE TABLE IF NOT EXISTS "playerReports" (
    id SERIAL PRIMARY KEY,
    "athleteId" INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    "reportDate" TIMESTAMP NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
  )
`;
console.log('playerReports table created.');
await sql.end();
