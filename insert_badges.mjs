import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import postgres from 'postgres';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', { ssl: 'require', prepare: false });

const rows = parse(fs.readFileSync('/home/user/workspace/badges.csv', 'utf8'), {
  columns: true, skip_empty_lines: true, relaxQuotes: true,
});

console.log(`badges: ${rows.length} rows`);
let ins = 0, err = 0;
for (const row of rows) {
  try {
    await sql`
      INSERT INTO badges (id, "userId", "badgeType", "badgeName", "badgeDescription", "badgeIcon", "earnedAt", "createdAt")
      VALUES (
        ${parseInt(row.id)}, ${parseInt(row.userId)},
        ${row.badgeType?.trim()}, ${row.badgeName?.trim()},
        ${row.badgeDescription?.trim() || null},
        ${row.badgeIcon?.trim() || null},
        ${new Date(row.earnedAt)}, ${new Date(row.createdAt)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    ins++;
  } catch (e) {
    console.error(`  error id ${row.id}: ${e.message}`);
    err++;
  }
}
await sql.end();
console.log(`Done! Inserted: ${ins}, Errors: ${err}`);
