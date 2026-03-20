import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const users = require('/home/user/workspace/users.json');

const sql = postgres('postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres', {
  ssl: 'require',
  prepare: false,
});

// Temporary password for all migrated users — they'll reset via forgot-password
const TEMP_PASSWORD = 'ChangeMe2026!';
const tempHash = await bcrypt.hash(TEMP_PASSWORD, 10);

console.log(`Inserting ${users.length} users...`);

// Valid roles in our new schema enum
const validRoles = ['admin', 'coach', 'athlete', 'user', 'parent'];

let inserted = 0, errors = 0;

for (const u of users) {
  try {
    const role = validRoles.includes(u.role) ? u.role : 'athlete';
    const name = u.name?.trim().replace(/\n/g, '') || '';
    const email = u.email?.trim().toLowerCase();

    if (!email) { console.log(`Skipping user ${u.id} — no email`); continue; }

    await sql`
      INSERT INTO users (
        id, email, "passwordHash", name, "loginMethod", role,
        "isActiveClient", "emailVerified", "emailVerificationToken",
        "sentWelcomeEmail", "parentId", "createdAt", "updatedAt", "lastSignedIn"
      ) VALUES (
        ${u.id},
        ${email},
        ${tempHash},
        ${name},
        ${'email'},
        ${role},
        ${u.isActiveClient ?? 1},
        ${u.emailVerified ?? 0},
        ${u.emailVerificationToken || null},
        ${u.sentWelcomeEmail ?? 0},
        ${u.parentId || null},
        ${new Date(u.createdAt)},
        ${new Date(u.updatedAt)},
        ${new Date(u.lastSignedIn)}
      )
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        "isActiveClient" = EXCLUDED."isActiveClient",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
    inserted++;
    console.log(`  ✓ ${name} (${email}) — ${role}`);
  } catch (err) {
    console.error(`  ✗ id ${u.id} (${u.email}): ${err.message}`);
    errors++;
  }
}

await sql.end();
console.log(`\nDone! Inserted/updated: ${inserted}, Errors: ${errors}`);
console.log(`\n⚠️  All users set with temp password: ${TEMP_PASSWORD}`);
console.log(`   Coach Steve's password will be overwritten on first login via /register`);
