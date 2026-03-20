import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';
const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', { ssl: 'require', prepare: false });
const r = await sql`SELECT id, "drillIds", "coachingCues" FROM "practicePlanBlocks" LIMIT 3`;
for (const row of r) {
  console.log('id:', row.id);
  console.log('  drillIds type:', typeof row.drillIds, 'isArr:', Array.isArray(row.drillIds), '→', row.drillIds);
  console.log('  coachingCues type:', typeof row.coachingCues, '→', row.coachingCues);
}
await sql.end();
