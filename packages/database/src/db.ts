import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users, usersRelations } from "./schema/users";
import {
  chronicleMembers,
  chronicleMembersRelations,
} from "./schema/chronicle-members";
import { storytellers, storytellersRelations } from "./schema/storytellers";
import { chronicles, chroniclesRelations } from "./schema/chronicles";
import {
  discordGuilds,
  discordGuildsRelations,
  discordGuildChronicles,
  discordGuildChroniclesRelations,
} from "./schema/discord-guilds";
import { initiativeTrackers } from "./schema/initiative";
import { commandStats } from "./schema/stats";
import {
  characters,
  charactersRelations,
  characterSplats,
} from "./schema/characters";
import {
  supporters,
  supportersRelations,
  supporterLevel,
} from "./schema/supporters";
import {
  interactionSessions,
  interactionSessionsRelations,
} from "./schema/interaction-sessions";

// Load environment variables from root .env file
config({ path: resolve(process.cwd(), "../../.env"), quiet: true });

/**
 * PostgreSQL connection pool
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Drizzle database instance singleton.
 *
 * Configured with:
 * - PostgreSQL connection pool from DATABASE_URL environment variable
 * - Snake case naming convention for database columns
 * - All schema tables included for type safety
 *
 * @example
 * ```typescript
 * import { db } from "@realm/database";
 *
 * const allUsers = await db.select().from(users);
 * ```
 */
export const db = drizzle(pool, {
  casing: "snake_case",
  schema: {
    users,
    usersRelations,
    chronicles,
    chroniclesRelations,
    discordGuilds,
    discordGuildsRelations,
    discordGuildChronicles,
    discordGuildChroniclesRelations,
    chronicleMembers,
    chronicleMembersRelations,
    storytellers,
    storytellersRelations,
    initiativeTrackers,
    commandStats,
    characters,
    charactersRelations,
    characterSplats,
    supporters,
    supportersRelations,
    supporterLevel,
    interactionSessions,
    interactionSessionsRelations,
  },
});

/**
 * Database type for use in repositories and services.
 * Provides full type safety for Drizzle queries.
 */
export type Database = typeof db;

/**
 * Close the database connection pool.
 * Should be called when shutting down the application or in test cleanup.
 */
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
