const bcrypt = require("bcryptjs");
const postgres = require("postgres");

async function main() {
  const sql = postgres(
    "postgresql://postgres.tqczkvytkkrfomyosbjp:M2WbuvZ2ldurpEBr@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
  );

  // First, check current state of the user
  const users = await sql`
    SELECT id, email, role, "passwordHash", "loginMethod"
    FROM users
    WHERE email = 'coach@coachstevebaseball.com'
  `;

  console.log("Found users:", users.length);
  if (users.length === 0) {
    console.log("No user found with that email!");
    console.log("\nListing all users:");
    const allUsers = await sql`SELECT id, email, role, "loginMethod" FROM users ORDER BY id`;
    console.log(allUsers);
    await sql.end();
    return;
  }

  const user = users[0];
  console.log("User ID:", user.id);
  console.log("Email:", user.email);
  console.log("Role:", user.role);
  console.log("Login method:", user.loginMethod);
  console.log("Has passwordHash:", !!user.passwordHash);
  console.log("Hash value:", user.passwordHash);

  // Test if admin123 matches current hash
  if (user.passwordHash) {
    const matches = bcrypt.compareSync("admin123", user.passwordHash);
    console.log("\n'admin123' matches current hash:", matches);
  }

  // Force set the password fresh
  const newHash = bcrypt.hashSync("admin123", 12);
  console.log("\nNew hash generated:", newHash);

  // Verify the new hash works before saving
  const verifyNew = bcrypt.compareSync("admin123", newHash);
  console.log("Verify new hash matches 'admin123':", verifyNew);

  const result = await sql`
    UPDATE users
    SET "passwordHash" = ${newHash}
    WHERE id = ${user.id}
    RETURNING id, email
  `;
  console.log("\nUpdated:", result);

  // Read back and verify
  const updated = await sql`
    SELECT "passwordHash" FROM users WHERE id = ${user.id}
  `;
  const finalCheck = bcrypt.compareSync("admin123", updated[0].passwordHash);
  console.log("Final verification - 'admin123' matches saved hash:", finalCheck);

  await sql.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
