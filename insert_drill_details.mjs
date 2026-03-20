import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import postgres from 'postgres';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const DATABASE_URL = 'postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  prepare: false,
});

const csvContent = fs.readFileSync('/home/user/workspace/drillDetailssupabaseproject.csv', 'utf8');

const rows = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relaxQuotes: true,
  relax_column_count: true,
});

console.log(`Parsed ${rows.length} rows from CSV`);

// Helper to safely parse JSON fields (already-arrays or stringified JSON)
function parseJsonField(val) {
  if (!val || val === '' || val === 'null') return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Try wrapping as single-item array
    return [val];
  }
}

let inserted = 0;
let skipped = 0;
let errors = 0;

for (const row of rows) {
  try {
    const id = parseInt(row.id);
    const drillId = row.drillId?.trim();
    const skillSet = row.skillSet?.trim() || '';
    const difficulty = row.difficulty?.trim() || '';
    const athletes = row.athletes?.trim() || '';
    const time = row.time?.trim() || '';
    const equipment = row.equipment?.trim() || '';
    const goal = row.goal?.trim() || '';
    const description = parseJsonField(row.description);
    const commonMistakes = parseJsonField(row.commonMistakes);
    const progressions = parseJsonField(row.progressions);
    const instructions = row.instructions?.trim() || null;
    const createdBy = parseInt(row.createdBy) || 1;
    const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
    const updatedAt = row.updatedAt ? new Date(row.updatedAt) : new Date();

    if (!drillId) {
      console.log(`Skipping row ${id} — no drillId`);
      skipped++;
      continue;
    }

    await sql`
      INSERT INTO "drillDetails" (
        id, "drillId", "skillSet", difficulty, athletes, time, equipment, goal,
        description, "commonMistakes", progressions, instructions,
        "createdBy", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${drillId}, ${skillSet}, ${difficulty}, ${athletes}, ${time}, ${equipment}, ${goal},
        ${JSON.stringify(description)}::jsonb, ${JSON.stringify(commonMistakes)}::jsonb,
        ${JSON.stringify(progressions)}::jsonb, ${instructions},
        ${createdBy}, ${createdAt}, ${updatedAt}
      )
      ON CONFLICT ("drillId") DO UPDATE SET
        "skillSet" = EXCLUDED."skillSet",
        difficulty = EXCLUDED.difficulty,
        athletes = EXCLUDED.athletes,
        time = EXCLUDED.time,
        equipment = EXCLUDED.equipment,
        goal = EXCLUDED.goal,
        description = EXCLUDED.description,
        "commonMistakes" = EXCLUDED."commonMistakes",
        progressions = EXCLUDED.progressions,
        instructions = EXCLUDED.instructions,
        "updatedAt" = EXCLUDED."updatedAt"
    `;
    inserted++;
    if (inserted % 50 === 0) console.log(`  ...${inserted} inserted`);
  } catch (err) {
    console.error(`Error on drillId ${row.drillId}: ${err.message}`);
    errors++;
  }
}

await sql.end();
console.log(`\nDone! Inserted/updated: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);
