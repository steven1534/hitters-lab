import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, int, varchar, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

// Define schema inline to avoid TypeScript import
const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActiveClient: int("isActiveClient").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

const db = drizzle(process.env.DATABASE_URL);

async function seedDemoClients() {
  console.log("🌱 Seeding demo client accounts...");

  try {
    // Demo Active Client
    await db.insert(users).values({
      openId: "demo-active-client",
      name: "Demo Active Client",
      email: "active@demo.example.com",
      loginMethod: "demo",
      role: "user",
      isActiveClient: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }).onDuplicateKeyUpdate({
      set: {
        name: "Demo Active Client",
        email: "active@demo.example.com",
        isActiveClient: 1,
        updatedAt: new Date(),
      }
    });

    console.log("✅ Created: Demo Active Client (has access to drills)");

    // Demo Inactive Client
    await db.insert(users).values({
      openId: "demo-inactive-client",
      name: "Demo Inactive Client",
      email: "inactive@demo.example.com",
      loginMethod: "demo",
      role: "user",
      isActiveClient: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }).onDuplicateKeyUpdate({
      set: {
        name: "Demo Inactive Client",
        email: "inactive@demo.example.com",
        isActiveClient: 0,
        updatedAt: new Date(),
      }
    });

    console.log("✅ Created: Demo Inactive Client (no access to drills)");

    console.log("\n📊 Demo Accounts Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("│ Account              │ Email                      │ Access │");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("│ Demo Active Client   │ active@demo.example.com    │ ✅ Yes │");
    console.log("│ Demo Inactive Client │ inactive@demo.example.com  │ ❌ No  │");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n💡 You can toggle their access in the Admin Dashboard!");
    console.log("   Navigate to /admin to manage client permissions.\n");

  } catch (error) {
    console.error("❌ Error seeding demo clients:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedDemoClients();
