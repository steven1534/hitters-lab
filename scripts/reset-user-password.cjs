/**
 * Reset a user's password hash in Postgres (bcrypt rounds = 12, matches server).
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL = "<copy from Render → Environment → DATABASE_URL>"
 *   node scripts/reset-user-password.cjs coach@coachstevebaseball.com "YourNewPassword"
 *
 * Or one line:
 *   $env:DATABASE_URL="postgresql://..."; node scripts/reset-user-password.cjs coach@coachstevebaseball.com admin123
 */
const bcrypt = require("bcryptjs");
const postgres = require("postgres");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.trim()) {
    console.error("ERROR: Set DATABASE_URL to the same value as Render (Environment → DATABASE_URL).");
    process.exit(1);
  }

  const email = (process.argv[2] || "coach@coachstevebaseball.com").trim();
  const plain = process.argv[3];
  if (!plain || !plain.length) {
    console.error("Usage: node scripts/reset-user-password.cjs <email> <new-password>");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  try {
    const hash = await bcrypt.hash(plain, 12);
    const rows = await sql`
      UPDATE users
      SET "passwordHash" = ${hash}
      WHERE lower(trim(email)) = lower(trim(${email}))
      RETURNING id, email, role
    `;
    if (rows.length === 0) {
      console.error("No user found with that email. Check DATABASE_URL matches Render and email is correct.");
      process.exit(1);
    }
    console.log("Password updated for:", rows[0]);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
