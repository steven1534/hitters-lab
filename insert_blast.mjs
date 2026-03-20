import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import postgres from 'postgres';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', {
  ssl: 'require',
  prepare: false,
});

const parseCSV = (file) => parse(fs.readFileSync(file, 'utf8'), {
  columns: true, skip_empty_lines: true, relaxQuotes: true, relax_column_count: true,
});

// ── 1. blastPlayers (must go first — sessions reference it) ──
const players = parseCSV('/home/user/workspace/blastPlayers.csv');
console.log(`blastPlayers: ${players.length} rows`);
let pIns = 0, pErr = 0;
for (const row of players) {
  try {
    const userId = row.userId?.trim() ? parseInt(row.userId) : null;
    const blastEmail = row.blastEmail?.trim() || null;
    const fullName = row.fullName?.trim() || '';
    await sql`
      INSERT INTO "blastPlayers" (id, "fullName", "userId", "blastEmail", "createdAt")
      VALUES (${String(row.id).trim()}, ${fullName}, ${userId}, ${blastEmail}, ${new Date(row.createdAt)})
      ON CONFLICT (id) DO UPDATE SET
        "fullName" = EXCLUDED."fullName",
        "userId" = EXCLUDED."userId"
    `;
    pIns++;
  } catch (err) {
    console.error(`  players error id ${row.id}: ${err.message}`);
    pErr++;
  }
}
console.log(`  → Inserted: ${pIns}, Errors: ${pErr}`);

// ── 2. blastSessions ──────────────────────────────────────────
const sessions = parseCSV('/home/user/workspace/blastSessions.csv');
console.log(`\nblastSessions: ${sessions.length} rows`);
let sIns = 0, sErr = 0;
for (const row of sessions) {
  try {
    await sql`
      INSERT INTO "blastSessions" (id, "playerId", "sessionDate", "sessionType", "createdAt")
      VALUES (
        ${row.id?.trim()},
        ${String(row.playerId).trim()},
        ${new Date(row.sessionDate)},
        ${row.sessionType?.trim() || null},
        ${new Date(row.createdAt)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    sIns++;
  } catch (err) {
    console.error(`  sessions error id ${row.id}: ${err.message}`);
    sErr++;
  }
}
console.log(`  → Inserted: ${sIns}, Errors: ${sErr}`);

// ── 3. blastMetrics ───────────────────────────────────────────
const metrics = parseCSV('/home/user/workspace/blastMetrics.csv');
console.log(`\nblastMetrics: ${metrics.length} rows`);
let mIns = 0, mErr = 0;
for (const row of metrics) {
  try {
    await sql`
      INSERT INTO "blastMetrics" (id, "sessionId", "batSpeedMph", "onPlaneEfficiencyPercent", "attackAngleDeg", "exitVelocityMph")
      VALUES (
        ${parseInt(row.id)},
        ${row.sessionId?.trim()},
        ${row.batSpeedMph?.trim() || null},
        ${row.onPlaneEfficiencyPercent?.trim() || null},
        ${row.attackAngleDeg?.trim() || null},
        ${row.exitVelocityMph?.trim() || null}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    mIns++;
  } catch (err) {
    console.error(`  metrics error id ${row.id}: ${err.message}`);
    mErr++;
  }
}
console.log(`  → Inserted: ${mIns}, Errors: ${mErr}`);

await sql.end();
console.log('\nAll blast data done!');
