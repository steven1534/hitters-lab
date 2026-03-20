import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';
const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', { ssl: 'require', prepare: false });
const tables = ['drillDetails','drillVideos','drillStatCards','drillCustomizations','drillAssignments','drillFavorites','sessionNotes','invites','users','blastMetrics','blastSessions','blastPlayers','practicePlans','practicePlanBlocks','drillSubmissions','videoAnalysis','badges','messages','athleteProfiles','progressReports','customDrills','siteContent'];
for (const t of tables) {
  const res = await sql`SELECT COUNT(*) as count FROM ${sql(t)}`;
  const n = parseInt(res[0].count);
  console.log(`${n > 0 ? '✅' : '⚪'} ${t}: ${n} rows`);
}
await sql.end();
