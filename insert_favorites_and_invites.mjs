import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import postgres from 'postgres';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', {
  ssl: 'require',
  prepare: false,
});

// ── drillFavorites ──────────────────────────────────────────
const favRows = parse(fs.readFileSync('/home/user/workspace/drillFavorites.csv', 'utf8'), {
  columns: true, skip_empty_lines: true, relaxQuotes: true,
});
console.log(`drillFavorites: ${favRows.length} rows`);

let favInserted = 0, favErrors = 0;
for (const row of favRows) {
  try {
    await sql`
      INSERT INTO "drillFavorites" (id, "userId", "drillId", "createdAt")
      VALUES (${parseInt(row.id)}, ${parseInt(row.userId)}, ${parseInt(row.drillId)}, ${new Date(row.createdAt)})
      ON CONFLICT (id) DO NOTHING
    `;
    favInserted++;
  } catch (err) {
    console.error(`  favs error id ${row.id}: ${err.message}`);
    favErrors++;
  }
}
console.log(`  → Inserted: ${favInserted}, Errors: ${favErrors}`);

// ── invites ─────────────────────────────────────────────────
const invRows = parse(fs.readFileSync('/home/user/workspace/invites.csv', 'utf8'), {
  columns: true, skip_empty_lines: true, relaxQuotes: true,
});
console.log(`\ninvites: ${invRows.length} rows`);

const validRoles = ['user', 'admin', 'athlete', 'coach'];
const validStatuses = ['pending', 'accepted', 'expired'];

let invInserted = 0, invErrors = 0;
for (const row of invRows) {
  try {
    const role = validRoles.includes(row.role) ? row.role : 'athlete';
    const status = validStatuses.includes(row.status) ? row.status : 'pending';
    const acceptedAt = row.acceptedAt?.trim() ? new Date(row.acceptedAt) : null;
    const acceptedByUserId = row.acceptedByUserId?.trim() ? parseInt(row.acceptedByUserId) : null;

    await sql`
      INSERT INTO invites (
        id, email, "inviteToken", role, status, "expiresAt",
        "acceptedAt", "acceptedByUserId", "reminderSent", "createdAt", "createdByUserId"
      ) VALUES (
        ${parseInt(row.id)},
        ${row.email?.trim().toLowerCase()},
        ${row.inviteToken?.trim()},
        ${role},
        ${status},
        ${new Date(row.expiresAt)},
        ${acceptedAt},
        ${acceptedByUserId},
        ${parseInt(row.reminderSent) || 0},
        ${new Date(row.createdAt)},
        ${parseInt(row.createdByUserId) || 1}
      )
      ON CONFLICT ("inviteToken") DO NOTHING
    `;
    invInserted++;
  } catch (err) {
    console.error(`  invites error id ${row.id}: ${err.message}`);
    invErrors++;
  }
}
console.log(`  → Inserted: ${invInserted}, Errors: ${invErrors}`);

await sql.end();
console.log('\nAll done!');
