/**
 * Database Reset Script
 *
 * This script drops all tables, enums, and schemas, then recreates a fresh database.
 * Use this during development when you need to reset to a clean state.
 *
 * @usage pnpm --filter @realm/database reset
 */
import { sql } from "drizzle-orm";
import { db } from "../src/";

async function resetDatabase() {
  try {
    console.log("🗑️  Dropping public schema...");

    // Drop the public and drizzle migration schemas cascade (removes all tables, types, and migration tracking)
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`);
    await db.execute(sql`DROP SCHEMA public CASCADE;`);

    console.log("✅ Public and drizzle schemas dropped");
    console.log("🔨 Recreating public schema...");

    // Recreate public schema
    await db.execute(sql`CREATE SCHEMA public;`);

    // Grant permissions to the database user
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const match = dbUrl.match(/postgresql:\/\/([^:@]+)/);
      if (match) {
        const dbUser = match[1];
        console.log(`🔐 Granting permissions to user: ${dbUser}`);
        await db.execute(sql.raw(`GRANT ALL ON SCHEMA public TO ${dbUser};`));
        await db.execute(sql.raw(`GRANT ALL ON SCHEMA public TO public;`));
      }
    }

    console.log("✅ Database reset complete!");
    console.log("");
    console.log("🔄 Next steps:");
    console.log("   1. Run: pnpm db:migrate");
    console.log("   2. (Optional) Run: pnpm db:studio");
    console.log("");

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to reset database:", error);
    console.error("");
    console.error("💡 Make sure:");
    console.error("   - PostgreSQL is running");
    console.error("   - DATABASE_URL is set in .env");
    console.error("   - Your user has DROP/CREATE permissions");
    console.error("");
    process.exit(1);
  }
}

resetDatabase();
