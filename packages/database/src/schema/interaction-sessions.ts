import { pgTable, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { SnowflakeSchema } from "@realm/common";
import { users } from "./users";
import { snowflake } from "../schema.types";
import type { InferSelectModel } from "drizzle-orm";
import type { z } from "zod";

/**
 * Ephemeral interaction sessions table for stateless Discord workflows.
 *
 * Replaces in-memory Discord.js component collectors and avoids storing
 * large session payloads in Redis RAM. Each button, select menu, or modal
 * carries only `{handlerId}:{sessionId}` in its `customId` and loads/mutates
 * its validated JSONB state here.
 */
export const interactionSessions = pgTable(
  "interaction_sessions",
  {
    id: snowflake().primaryKey(),
    userId: snowflake()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    handlerId: varchar({ length: 64 }).notNull(),
    step: varchar({ length: 64 }).notNull(),
    state: jsonb().notNull(),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    index("interaction_sessions_user_id_idx").on(table.userId),
    index("interaction_sessions_expires_at_idx").on(table.expiresAt),
  ]
);

/**
 * Drizzle relation linking an interaction session to its owning user.
 */
export const interactionSessionsRelations = relations(
  interactionSessions,
  ({ one }) => ({
    user: one(users, {
      fields: [interactionSessions.userId],
      references: [users.id],
    }),
  })
);

/**
 * Inferred database row type for `interaction_sessions`.
 */
export type InteractionSessionDb = InferSelectModel<typeof interactionSessions>;

/**
 * Zod schema for selecting an interaction session row from PostgreSQL.
 */
export const selectInteractionSessionSchema = createSelectSchema(
  interactionSessions,
  {
    id: SnowflakeSchema,
    userId: SnowflakeSchema,
  }
);

/**
 * Zod schema for inserting an interaction session row into PostgreSQL.
 */
export const insertInteractionSessionSchema = createInsertSchema(
  interactionSessions,
  {
    id: SnowflakeSchema,
    userId: SnowflakeSchema,
  }
);

/**
 * Zod schema for updating an interaction session row in PostgreSQL.
 */
export const updateInteractionSessionSchema = createUpdateSchema(
  interactionSessions,
  {
    id: SnowflakeSchema,
    userId: SnowflakeSchema,
  }
);

/**
 * Inferred TypeScript type for selecting an interaction session row.
 */
export type SelectInteractionSessionData = z.infer<
  typeof selectInteractionSessionSchema
>;

/**
 * Inferred TypeScript type for inserting an interaction session row.
 */
export type InsertInteractionSessionData = z.infer<
  typeof insertInteractionSessionSchema
>;

/**
 * Inferred TypeScript type for updating an interaction session row.
 */
export type UpdateInteractionSessionData = z.infer<
  typeof updateInteractionSessionSchema
>;
