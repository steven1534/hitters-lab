import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const DATABASE_URL = process.env.DATABASE_URL
  || 'postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres';
const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

const rows = parse(fs.readFileSync('C:/Users/coach/Downloads/drillVideosimport.csv', 'utf8'), {
  columns: true, skip_empty_lines: true, relaxQuotes: true,
});

console.log(`Found ${rows.length} drill videos to import\n`);

let inserted = 0, updated = 0, errors = 0;
for (const row of rows) {
  const drillId = row.drillId?.trim();
  const videoUrl = row.videoUrl?.trim();
  if (!drillId || !videoUrl) continue;

  try {
    const existing = await sql`SELECT id FROM "drillVideos" WHERE "drillId" = ${drillId}`;
    if (existing.length > 0) {
      await sql`UPDATE "drillVideos" SET "videoUrl" = ${videoUrl}, "updatedAt" = NOW() WHERE "drillId" = ${drillId}`;
      updated++;
    } else {
      await sql`INSERT INTO "drillVideos" ("drillId", "videoUrl", "uploadedBy") VALUES (${drillId}, ${videoUrl}, 1)`;
      inserted++;
    }
  } catch (e) {
    console.error(`  Error for ${drillId}: ${e.message}`);
    errors++;
  }
}

await sql.end();
console.log(`Done! Inserted: ${inserted}, Updated: ${updated}, Errors: ${errors}`);
