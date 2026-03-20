import postgres from 'postgres';

const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require',
  prepare: false,
});

console.log("=== blastPlayers ===");
const players = await sql`SELECT id, "fullName", "userId", "blastEmail" FROM "blastPlayers" ORDER BY "fullName"`;
console.table(players);

console.log("\n=== sessions per player ===");
const sessions = await sql`
  SELECT bp."fullName", bp."userId", COUNT(bs.id)::int as session_count 
  FROM "blastPlayers" bp 
  LEFT JOIN "blastSessions" bs ON bs."playerId" = bp.id 
  GROUP BY bp.id, bp."fullName", bp."userId" 
  ORDER BY bp."fullName"
`;
console.table(sessions);

await sql.end();
