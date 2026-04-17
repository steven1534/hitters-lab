import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL
  || 'postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres';
const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

// Import drill data inline (extracted from drills.ts)
const { default: drillsModule } = await import('./client/src/data/drills.ts').catch(() => ({ default: null }));

// Since drills.ts is TypeScript, we need to read and parse it manually
import fs from 'fs';
const fileContent = fs.readFileSync('./client/src/data/drills.ts', 'utf8');

// Extract drill objects with their tags using regex
const drillTagMap = new Map();
const drillRegex = /{\s*id:\s*"([^"]+)"[\s\S]*?tags:\s*\[([^\]]*)\]/g;
let match;
while ((match = drillRegex.exec(fileContent)) !== null) {
  const id = match[1];
  const tagsStr = match[2];
  const tags = tagsStr.match(/"([^"]+)"/g)?.map(t => t.replace(/"/g, '')) || [];
  if (tags.length > 0) {
    drillTagMap.set(id, tags);
  }
}

console.log(`Found ${drillTagMap.size} drills with tags in drills.ts`);

let updated = 0, inserted = 0, errors = 0;
for (const [drillId, tags] of drillTagMap) {
  try {
    const existing = await sql`SELECT id FROM "drillDetails" WHERE "drillId" = ${drillId}`;
    if (existing.length > 0) {
      await sql`UPDATE "drillDetails" SET "tags" = ${JSON.stringify(tags)}::json, "updatedAt" = NOW() WHERE "drillId" = ${drillId}`;
      updated++;
    } else {
      await sql`INSERT INTO "drillDetails" ("drillId", "skillSet", "difficulty", "athletes", "time", "equipment", "goal", "description", "tags", "createdBy")
        VALUES (${drillId}, 'Hitting', 'Medium', 'All Ages', 'Varies', 'Varies', '', ${JSON.stringify([])}::json, ${JSON.stringify(tags)}::json, 0)`;
      inserted++;
    }
  } catch (e) {
    console.error(`  Error for ${drillId}: ${e.message}`);
    errors++;
  }
}

await sql.end();
console.log(`\nDone! Updated: ${updated}, Inserted: ${inserted}, Errors: ${errors}`);
