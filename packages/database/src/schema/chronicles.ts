import type { InferSelectModel } from "drizzle-orm";
import type { z } from "zod";
import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import {
  GuildNameConstraints,
  DiscordCdnUrlMaxLength,
  SnowflakeSchema,
  GameEditionSchema,
} from "@realm/common";
import { snowflake } from "../schema.types";
import { chronicleMembers } from "./chronicle-members";
import { discordGuildChronicles } from "./discord-guilds";

/**
 * Chronicle table - represents the core game session.
 */
export const chronicles = pgTable("chronicles", {
  id: snowflake().primaryKey(),
  name: varchar({
    length: GuildNameConstraints.MaxLength,
  }).notNull(),
  iconUrl: varchar({ length: DiscordCdnUrlMaxLength }).notNull().default(""),
  defaultVersion: varchar({ length: 16 }).notNull().default("5th"),
  storytellerRoleIds: snowflake().array().notNull().default([]),

  createdAt: timestamp().defaultNow().notNull(),
  lastUpdated: timestamp().defaultNow().notNull(),
});

// ============================================================================
// Relations
// ============================================================================

export const chroniclesRelations = relations(chronicles, ({ many }) => ({
  members: many(chronicleMembers),
  discordGuilds: many(discordGuildChronicles),
}));

// ============================================================================
// Zod Schemas & Types
// ============================================================================

export type ChronicleDb = InferSelectModel<typeof chronicles>;

/**
 * Zod schema for selecting/reading chronicle records from the database.
 */
export const selectChronicleSchema = createSelectSchema(chronicles, {
  id: SnowflakeSchema,
  defaultVersion: GameEditionSchema,
  storytellerRoleIds: SnowflakeSchema.array(),
});
export type SelectChronicleData = z.infer<typeof selectChronicleSchema>;

/**
 * Zod schema for inserting new chronicle records into the database.
 */
export const insertChronicleSchema = createInsertSchema(chronicles, {
  id: SnowflakeSchema,
  defaultVersion: GameEditionSchema.optional(),
  storytellerRoleIds: SnowflakeSchema.array().optional(),
});
export type InsertChronicleData = z.infer<typeof insertChronicleSchema>;

/**
 * Zod schema for updating existing chronicle records in the database.
 */
export const updateChronicleSchema = createUpdateSchema(chronicles, {
  id: SnowflakeSchema,
  defaultVersion: GameEditionSchema.optional(),
  storytellerRoleIds: SnowflakeSchema.array().optional(),
});
export type UpdateChronicleData = z.infer<typeof updateChronicleSchema>;
