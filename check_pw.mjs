import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres("postgresql://postgres.gmrrpvctlujsvhiwkivu:Thorbuddy1534!@aws-1-us-east-2.pooler.supabase.com:6543/postgres", {
  ssl: 'require', prepare: false,
});

const [row] = await sql`SELECT "passwordHash" FROM users WHERE role = 'athlete' LIMIT 1`;
const hash = row.passwordHash;

const candidates = ['HittersLab2026!', 'hitterslab', 'HittersLab', 'Hitters2026!', 'HitterLab2026!', 'CoachSteve2026!', 'TempPass2026!', 'athlete123', 'Baseball2026!', 'hitters2026'];

for (const pw of candidates) {
  const match = await bcrypt.compare(pw, hash);
  if (match) console.log(`MATCH: "${pw}"`);
}
console.log('Done checking.');
await sql.end();
