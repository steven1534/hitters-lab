import postgres from 'postgres';

const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require',
  prepare: false,
});

console.log("=== Full blast chain: player → sessions → metrics ===");
const full = await sql`
  SELECT 
    bp."fullName" as blast_name,
    u.name as portal_name,
    u.email as portal_email,
    bp."userId",
    bs.id as session_id,
    bs."sessionDate",
    bs."sessionType",
    bm."batSpeedMph",
    bm."onPlaneEfficiencyPercent",
    bm."attackAngleDeg",
    bm."exitVelocityMph"
  FROM "blastPlayers" bp
  LEFT JOIN "users" u ON u.id = bp."userId"
  LEFT JOIN "blastSessions" bs ON bs."playerId" = bp.id
  LEFT JOIN "blastMetrics" bm ON bm."sessionId" = bs.id
  ORDER BY bp."fullName", bs."sessionDate"
`;
console.table(full);

await sql.end();
