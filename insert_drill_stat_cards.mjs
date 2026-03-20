import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import postgres from 'postgres';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', {
  ssl: 'require',
  prepare: false,
});

const rows = parse(fs.readFileSync('/home/user/workspace/drillStatCards.csv', 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  relaxQuotes: true,
  relax_column_count: true,
});

console.log(`Parsed ${rows.length} rows`);

let inserted = 0, errors = 0;

for (const row of rows) {
  try {
    await sql`
      INSERT INTO "drillStatCards" (id, "drillId", label, value, icon, position, "isVisible", "createdAt", "updatedAt")
      VALUES (
        ${parseInt(row.id)},
        ${row.drillId?.trim()},
        ${row.label?.trim()},
        ${row.value?.trim() || ''},
        ${row.icon?.trim() || 'info'},
        ${parseInt(row.position) || 0},
        ${parseInt(row.isVisible) ?? 1},
        ${new Date(row.createdAt)},
        ${new Date(row.updatedAt)}
      )
      ON CONFLICT (id) DO UPDATE SET
        "drillId" = EXCLUDED."drillId",
        label = EXCLUDED.label,
        value = EXCLUDED.value,
        icon = EXCLUDED.icon,
        position = EXCLUDED.position,
        "isVisible" = EXCLUDED."isVisible",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
    inserted++;
  } catch (err) {
    console.error(`Error on id ${row.id} (${row.drillId}): ${err.message}`);
    errors++;
  }
}

await sql.end();
console.log(`\nDone! Inserted/updated: ${inserted}, Errors: ${errors}`);
