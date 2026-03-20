import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import postgres from 'postgres';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', {
  ssl: 'require',
  prepare: false,
});

const rows = parse(fs.readFileSync('/home/user/workspace/drillAssignments.csv', 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  relaxQuotes: true,
  relax_column_count: true,
});

console.log(`Parsed ${rows.length} rows`);

const validStatuses = ['assigned', 'in-progress', 'completed'];

let inserted = 0, errors = 0;

for (const row of rows) {
  try {
    const status = validStatuses.includes(row.status) ? row.status : 'assigned';
    const userId = row.userId ? parseInt(row.userId) : null;
    const inviteId = row.inviteId ? parseInt(row.inviteId) : null;
    const completedAt = row.completedAt?.trim() ? new Date(row.completedAt) : null;

    await sql`
      INSERT INTO "drillAssignments" (
        id, "userId", "inviteId", "drillId", "drillName",
        status, notes, "assignedAt", "completedAt", "updatedAt"
      ) VALUES (
        ${parseInt(row.id)},
        ${userId},
        ${inviteId},
        ${row.drillId?.trim()},
        ${row.drillName?.trim() || ''},
        ${status},
        ${row.notes?.trim() || null},
        ${new Date(row.assignedAt)},
        ${completedAt},
        ${new Date(row.updatedAt)}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        "completedAt" = EXCLUDED."completedAt",
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
