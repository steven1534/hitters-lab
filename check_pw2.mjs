import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require', prepare: false,
});

const [row] = await sql`SELECT "passwordHash" FROM users WHERE role = 'athlete' LIMIT 1`;
const hash = row.passwordHash;

const candidates = [
  'HittersLab2026', 'hitters-lab', 'HittersLab1', 'hitterslabapp',
  'DrillLibrary2026!', 'Baseball123!', 'Coach2026!', 'Athlete2026!',
  'Welcome2026!', 'hitterslab2026', 'HittersLab2025!', 'HittersLab123',
  'hlab2026', 'HLab2026!', 'coachsteve', 'CoachSteve123',
];

for (const pw of candidates) {
  const match = await bcrypt.compare(pw, hash);
  if (match) console.log(`MATCH: "${pw}"`);
}
console.log('Done checking.');
await sql.end();
