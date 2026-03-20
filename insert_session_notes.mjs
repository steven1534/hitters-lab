import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import postgres from 'postgres';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', {
  ssl: 'require',
  prepare: false,
});

const rows = parse(fs.readFileSync('/home/user/workspace/sessionNotes.csv', 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  relaxQuotes: true,
  relax_column_count: true,
});

console.log(`Parsed ${rows.length} rows`);

function parseJsonField(val) {
  if (!val || val.trim() === '' || val.trim() === 'null') return null;
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

let inserted = 0, errors = 0;

for (const row of rows) {
  try {
    const duration = row.duration?.trim() ? parseInt(row.duration) : null;
    const overallRating = row.overallRating?.trim() ? parseInt(row.overallRating) : null;
    const practicePlanId = row.practicePlanId?.trim() ? parseInt(row.practicePlanId) : null;
    const blastSessionId = row.blastSessionId?.trim() || null;
    const sessionLabel = row.sessionLabel?.trim() || null;
    const privateNotes = row.privateNotes?.trim() || null;
    const sharedWithAthlete = row.sharedWithAthlete === '1' || row.sharedWithAthlete === 'true';

    const skillsWorked = parseJsonField(row.skillsWorked) ?? [];
    const homeworkDrills = parseJsonField(row.homeworkDrills);

    await sql`
      INSERT INTO "sessionNotes" (
        id, "coachId", "athleteId", "sessionNumber", "sessionLabel",
        "sessionDate", duration, "skillsWorked", "whatImproved", "whatNeedsWork",
        "homeworkDrills", "overallRating", "privateNotes", "practicePlanId",
        "blastSessionId", "sharedWithAthlete", "createdAt", "updatedAt"
      ) VALUES (
        ${parseInt(row.id)},
        ${parseInt(row.coachId)},
        ${parseInt(row.athleteId)},
        ${parseInt(row.sessionNumber) || 1},
        ${sessionLabel},
        ${new Date(row.sessionDate)},
        ${duration},
        ${JSON.stringify(skillsWorked)}::jsonb,
        ${row.whatImproved?.trim() || ''},
        ${row.whatNeedsWork?.trim() || ''},
        ${homeworkDrills ? JSON.stringify(homeworkDrills) + '::jsonb' : null},
        ${overallRating},
        ${privateNotes},
        ${practicePlanId},
        ${blastSessionId},
        ${sharedWithAthlete},
        ${new Date(row.createdAt)},
        ${new Date(row.updatedAt)}
      )
      ON CONFLICT (id) DO UPDATE SET
        "whatImproved" = EXCLUDED."whatImproved",
        "whatNeedsWork" = EXCLUDED."whatNeedsWork",
        "overallRating" = EXCLUDED."overallRating",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
    inserted++;
  } catch (err) {
    console.error(`Error on id ${row.id}: ${err.message}`);
    errors++;
  }
}

await sql.end();
console.log(`\nDone! Inserted/updated: ${inserted}, Errors: ${errors}`);
