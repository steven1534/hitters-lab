import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', { ssl: 'require', prepare: false });

const rows = parse(fs.readFileSync('/home/user/workspace/athleteProfiles.csv', 'utf8'), {
  columns: true, skip_empty_lines: true, relaxQuotes: true, relax_column_count: true,
});

console.log(`athleteProfiles: ${rows.length} rows`);

const validBats = ['L', 'R', 'S'];
const validThrows = ['L', 'R'];

function parseJson(val) {
  if (!val || val.trim() === '' || val.trim() === 'null') return null;
  try { return JSON.parse(val); } catch { return null; }
}

let ins = 0, err = 0;
for (const row of rows) {
  try {
    const bats = validBats.includes(row.bats?.trim()) ? row.bats.trim() : null;
    const throws_ = validThrows.includes(row.throws?.trim()) ? row.throws.trim() : null;
    const birthDate = row.birthDate?.trim() ? new Date(row.birthDate) : null;
    const focusAreas = parseJson(row.focusAreas);

    await sql`
      INSERT INTO "athleteProfiles" (
        id, "userId", "birthDate", position, "secondaryPosition",
        bats, throws, "teamName", "focusAreas",
        "parentName", "parentEmail", "parentPhone",
        "createdAt", "updatedAt"
      ) VALUES (
        ${parseInt(row.id)}, ${parseInt(row.userId)}, ${birthDate},
        ${row.position?.trim() || null}, ${row.secondaryPosition?.trim() || null},
        ${bats}, ${throws_}, ${row.teamName?.trim() || null},
        ${focusAreas ? JSON.stringify(focusAreas) + '::jsonb' : null},
        ${row.parentName?.trim() || null}, ${row.parentEmail?.trim() || null},
        ${row.parentPhone?.trim() || null},
        ${new Date(row.createdAt)}, ${new Date(row.updatedAt)}
      )
      ON CONFLICT ("userId") DO UPDATE SET
        position = EXCLUDED.position,
        "teamName" = EXCLUDED."teamName",
        "parentName" = EXCLUDED."parentName",
        "parentEmail" = EXCLUDED."parentEmail",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
    ins++;
    console.log(`  ✓ userId ${row.userId} (${row.position || 'no position'})`);
  } catch (e) {
    console.error(`  ✗ id ${row.id}: ${e.message}`);
    err++;
  }
}
await sql.end();
console.log(`\nDone! Inserted: ${ins}, Errors: ${err}`);
