import type { InferSelectModel } from "drizzle-orm";
import type { z } from "zod";

import {
  pgTable,
  pgEnum,
  varchar,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import {
  Splat,
  CharacterConstraints,
  CharacterStatus,
  SplatSchema,
  CharacterStatusSchema,
  SnowflakeSchema,
} from "@realm/common";
import { users } from "../users";
import { chronicles } from "../chronicles";
import { chronicleMembers } from "../chronicle-members";
import { snowflake } from "../../schema.types";

/**
 * Character Splat types Enum
 */
const splatValues = Object.values(Splat) as [string, ...string[]];
export const characterSplats = pgEnum("character_splats", splatValues);

/**
 * Character Status Enum
 */
const statusValues = Object.values(CharacterStatus) as [string, ...string[]];
export const characterStatus = pgEnum("character_status", statusValues);

/**
 * Main Characters table - Hybrid Relational + Validated JSONB document storage.
 *
 * Top-level columns store indexed identity, relation, and lookup metadata.
 * The polymorphic `data` JSONB column stores edition/splat-specific sheet payloads
 * validated by `@realm/common` Zod schemas.
 */
export const characters = pgTable(
  "characters",
  {
    id: snowflake().primaryKey(),
    name: varchar({ length: CharacterConstraints.Name.MaxLength }).notNull(),

    userId: snowflake()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    chronicleId: snowflake().references(() => chronicles.id, {
      onDelete: "set null",
    }),

    splat: characterSplats().$type<Splat>().notNull().default(Splat.Vampire5th),
    status: characterStatus()
      .$type<CharacterStatus>()
      .notNull()
      .default(CharacterStatus.Draft),

    avatarUrl: varchar({ length: 500 }),
    themeColor: varchar({ length: 10 }).notNull().default("#000000"),

    /**
     * Polymorphic game sheet payload (attributes, skills, trackers, disciplines, etc.)
     * Validated at application boundaries by CharacterSheetDataSchema.
     */
    data: jsonb().notNull(),

    createdAt: timestamp().defaultNow().notNull(),
    lastUpdated: timestamp().defaultNow().notNull(),
  },
  (table) => [
    index("characters_user_id_idx").on(table.userId),
    index("characters_chronicle_id_idx").on(table.chronicleId),
    index("characters_user_chronicle_idx").on(table.userId, table.chronicleId),
    index("characters_splat_idx").on(table.splat),
    index("characters_name_idx").on(table.name),
  ]
);

// Define relations
export const charactersRelations = relations(characters, ({ one }) => ({
  // Many-to-one relations
  user: one(users, {
    fields: [characters.userId],
    references: [users.id],
  }),
  chronicle: one(chronicles, {
    fields: [characters.chronicleId],
    references: [chronicles.id],
  }),
  // Inferred relation: member is the user-chronicle relationship
  // Only exists when character has a chronicle
  member: one(chronicleMembers, {
    fields: [characters.userId, characters.chronicleId],
    references: [chronicleMembers.userId, chronicleMembers.chronicleId],
  }),
}));

export type CharacterDb = InferSelectModel<typeof characters>;

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Zod schema for selecting/reading character records from the database.
 * Matches the exact structure returned by SELECT queries.
 */
export const selectCharacterSchema = createSelectSchema(characters, {
  id: SnowflakeSchema,
  userId: SnowflakeSchema,
  chronicleId: SnowflakeSchema.nullable(),
  splat: SplatSchema,
  status: CharacterStatusSchema,
});

/**
 * Zod schema for inserting new character records into the database.
 * Matches the structure required by INSERT queries.
 */
export const insertCharacterSchema = createInsertSchema(characters, {
  id: SnowflakeSchema,
  userId: SnowflakeSchema,
  chronicleId: SnowflakeSchema.nullable(),
  splat: SplatSchema,
  status: CharacterStatusSchema,
});

/**
 * Zod schema for updating character records in the database.
 * Matches the structure required by UPDATE queries.
 */
export const updateCharacterSchema = createUpdateSchema(characters, {
  id: SnowflakeSchema,
  userId: SnowflakeSchema,
  chronicleId: SnowflakeSchema.nullable(),
  splat: SplatSchema,
  status: CharacterStatusSchema,
});

// ============================================================================
// TypeScript Types (Inferred from Zod Schemas)
// ============================================================================

export type SelectCharacterData = z.infer<typeof selectCharacterSchema>;
export type InsertCharacterData = z.infer<typeof insertCharacterSchema>;
export type UpdateCharacterData = z.infer<typeof updateCharacterSchema>;
