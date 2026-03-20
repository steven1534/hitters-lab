import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import postgres from 'postgres';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', {
  ssl: 'require',
  prepare: false,
});

// Need large buffer for potential base64 fields
const csvContent = fs.readFileSync('/home/user/workspace/drillCustomizations.csv', 'utf8');

const rows = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relaxQuotes: true,
  relax_column_count: true,
  max_record_size: 10_000_000,
});

console.log(`Parsed ${rows.length} rows`);

let inserted = 0, errors = 0;

for (const row of rows) {
  try {
    const thumbnailUrl = row.thumbnailUrl?.trim() || null;
    const imageBase64 = row.imageBase64?.trim() || null;
    const imageMimeType = row.imageMimeType?.trim() || null;
    const briefDescription = row.briefDescription?.trim() || null;
    const difficulty = row.difficulty?.trim() || null;
    const category = row.category?.trim() || null;
    const updatedBy = parseInt(row.updatedBy) || 1;

    await sql`
      INSERT INTO "drillCustomizations" (
        id, "drillId", "thumbnailUrl", "imageBase64", "imageMimeType",
        "briefDescription", difficulty, category, "updatedBy", "createdAt", "updatedAt"
      ) VALUES (
        ${parseInt(row.id)},
        ${row.drillId?.trim()},
        ${thumbnailUrl},
        ${imageBase64},
        ${imageMimeType},
        ${briefDescription},
        ${difficulty},
        ${category},
        ${updatedBy},
        ${new Date(row.createdAt)},
        ${new Date(row.updatedAt)}
      )
      ON CONFLICT ("drillId") DO UPDATE SET
        "thumbnailUrl" = EXCLUDED."thumbnailUrl",
        "imageBase64" = EXCLUDED."imageBase64",
        "imageMimeType" = EXCLUDED."imageMimeType",
        "briefDescription" = EXCLUDED."briefDescription",
        difficulty = EXCLUDED.difficulty,
        category = EXCLUDED.category,
        "updatedAt" = EXCLUDED."updatedAt"
    `;
    inserted++;
    if (inserted % 25 === 0) console.log(`  ...${inserted} inserted`);
  } catch (err) {
    console.error(`Error on id ${row.id} (${row.drillId}): ${err.message}`);
    errors++;
  }
}

await sql.end();
console.log(`\nDone! Inserted/updated: ${inserted}, Errors: ${errors}`);
