import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';
const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', { ssl: 'require', prepare: false });

// Check drillVideos for pitching drills
const videos = await sql`SELECT "drillId", "videoUrl" FROM "drillVideos" WHERE "drillId" ILIKE '%arm%' OR "drillId" ILIKE '%pitch%' OR "drillId" ILIKE '%balance%' LIMIT 10`;
console.log('drillVideos pitching:', videos);

// Check drillDetails for videoUrl
const details = await sql`SELECT "drillId", "videoUrl" FROM "drillDetails" WHERE "videoUrl" IS NOT NULL AND "videoUrl" != '' LIMIT 5`;
console.log('drillDetails with video:', details);

await sql.end();
