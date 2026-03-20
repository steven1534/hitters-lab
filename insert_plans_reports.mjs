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
  max_record_size: 10_000_000,
});

function parseJson(val) {
  if (!val || val.trim() === '' || val.trim() === 'null') return null;
  try { return JSON.parse(val); } catch { return null; }
}

function nullInt(val) {
  return val?.trim() ? parseInt(val) : null;
}

// ── 1. practicePlans (must go before blocks) ─────────────────
const plans = parseCSV('/home/user/workspace/practicePlans.csv');
console.log(`practicePlans: ${plans.length} rows`);
const validPlanStatuses = ['draft', 'scheduled', 'completed', 'cancelled'];
let pIns = 0, pErr = 0;
for (const row of plans) {
  try {
    const status = validPlanStatuses.includes(row.status) ? row.status : 'draft';
    const sessionDate = row.sessionDate?.trim() ? new Date(row.sessionDate) : null;
    const focusAreas = parseJson(row.focusAreas);
    await sql`
      INSERT INTO "practicePlans" (
        id, "coachId", "athleteId", "inviteId", title, "sessionDate",
        duration, "sessionNotes", "focusAreas", status, "isShared", "isTemplate",
        "createdAt", "updatedAt"
      ) VALUES (
        ${parseInt(row.id)},
        ${parseInt(row.coachId)},
        ${nullInt(row.athleteId)},
        ${nullInt(row.inviteId)},
        ${row.title?.trim() || ''},
        ${sessionDate},
        ${parseInt(row.duration) || 0},
        ${row.sessionNotes?.trim() || null},
        ${focusAreas ? JSON.stringify(focusAreas) + '::jsonb' : null},
        ${status},
        ${parseInt(row.isShared) || 0},
        ${parseInt(row.isTemplate) || 0},
        ${new Date(row.createdAt)},
        ${new Date(row.updatedAt)}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        "updatedAt" = EXCLUDED."updatedAt"
    `;
    pIns++;
  } catch (err) {
    console.error(`  plans error id ${row.id}: ${err.message}`);
    pErr++;
  }
}
console.log(`  → Inserted: ${pIns}, Errors: ${pErr}`);

// ── 2. practicePlanBlocks ─────────────────────────────────────
const blocks = parseCSV('/home/user/workspace/practicePlanBlocks.csv');
console.log(`\npracticePlanBlocks: ${blocks.length} rows`);
const validBlockTypes = ['drill', 'warmup', 'cooldown', 'break', 'custom'];
const validIntensity = ['low', 'medium', 'high'];
let bIns = 0, bErr = 0;
for (const row of blocks) {
  try {
    const blockType = validBlockTypes.includes(row.blockType) ? row.blockType : 'custom';
    const intensity = validIntensity.includes(row.intensity) ? row.intensity : null;
    await sql`
      INSERT INTO "practicePlanBlocks" (
        id, "planId", "sortOrder", "blockType", "drillId", title, duration,
        sets, reps, notes, "coachingCues", "keyPoints", equipment, intensity, goal, "createdAt"
      ) VALUES (
        ${parseInt(row.id)},
        ${parseInt(row.planId)},
        ${parseInt(row.sortOrder) || 0},
        ${blockType},
        ${row.drillId?.trim() || null},
        ${row.title?.trim() || ''},
        ${parseInt(row.duration) || 0},
        ${nullInt(row.sets)},
        ${nullInt(row.reps)},
        ${row.notes?.trim() || null},
        ${row.coachingCues?.trim() || null},
        ${row.keyPoints?.trim() || null},
        ${row.equipment?.trim() || null},
        ${intensity},
        ${row.goal?.trim() || null},
        ${new Date(row.createdAt)}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    bIns++;
    if (bIns % 100 === 0) console.log(`  ...${bIns} blocks inserted`);
  } catch (err) {
    console.error(`  blocks error id ${row.id}: ${err.message}`);
    bErr++;
  }
}
console.log(`  → Inserted: ${bIns}, Errors: ${bErr}`);

// ── 3. progressReports ────────────────────────────────────────
const reports = parseCSV('/home/user/workspace/progressReports.csv');
console.log(`\nprogressReports: ${reports.length} rows`);
const validReportStatuses = ['draft', 'reviewed', 'sent'];
let rIns = 0, rErr = 0;
for (const row of reports) {
  try {
    const status = validReportStatuses.includes(row.reportStatus) ? row.reportStatus : 'draft';
    const reportContent = parseJson(row.reportContent) ?? {};
    const sentAt = row.sentAt?.trim() ? new Date(row.sentAt) : null;
    await sql`
      INSERT INTO "progressReports" (
        id, "coachId", "athleteId", "sessionNoteId", title,
        "reportContent", "reportHtml", status, "sentAt",
        "sentToEmail", "sentToName", "createdAt", "updatedAt"
      ) VALUES (
        ${parseInt(row.id)},
        ${parseInt(row.coachId)},
        ${parseInt(row.athleteId)},
        ${nullInt(row.sessionNoteId)},
        ${row.title?.trim() || ''},
        ${JSON.stringify(reportContent)}::jsonb,
        ${row.reportHtml?.trim() || null},
        ${status},
        ${sentAt},
        ${row.sentToEmail?.trim() || null},
        ${row.sentToName?.trim() || null},
        ${new Date(row.createdAt)},
        ${new Date(row.updatedAt)}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        "sentAt" = EXCLUDED."sentAt",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
    rIns++;
  } catch (err) {
    console.error(`  reports error id ${row.id}: ${err.message}`);
    rErr++;
  }
}
console.log(`  → Inserted: ${rIns}, Errors: ${rErr}`);

await sql.end();
console.log('\nAll done!');
