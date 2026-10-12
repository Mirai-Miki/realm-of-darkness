import { z } from "zod";

/**
 * Supported Discord slash command option types for MDX-defined commands.
 */
export const CommandOptionType = {
  String: "string",
  Integer: "integer",
  Number: "number",
  Boolean: "boolean",
  User: "user",
  Channel: "channel",
  Role: "role",
} as const;

/**
 * Zod schema for validating command option types.
 */
export const CommandOptionTypeSchema = z.enum(CommandOptionType);

/**
 * Inferred TypeScript type for command option types.
 */
export type CommandOptionType = z.infer<typeof CommandOptionTypeSchema>;

/**
 * Schema for a fixed choice on a string/integer/number command option.
 */
export const CommandOptionChoiceDataSchema = z.object({
  name: z.string().min(1).max(100),
  value: z.union([z.string().min(1).max(100), z.number()]),
});

/**
 * Inferred TypeScript type for a command option choice.
 */
export type CommandOptionChoiceData = z.infer<
  typeof CommandOptionChoiceDataSchema
>;

/**
 * Schema for a single Discord slash command option defined in MDX frontmatter.
 */
export const CommandOptionDataSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(32)
    .regex(
      /^[a-z0-9_-]+$/,
      "Option name must be lowercase alphanumeric, hyphen, or underscore"
    ),
  type: CommandOptionTypeSchema,
  description: z.string().min(1).max(100),
  required: z.boolean().default(false),
  autocomplete: z.boolean().default(false),
  minLength: z.number().int().min(0).max(6000).optional(),
  maxLength: z.number().int().min(1).max(6000).optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  choices: z.array(CommandOptionChoiceDataSchema).max(25).optional(),
});

/**
 * Inferred TypeScript type for a Discord slash command option definition.
 */
export type CommandOptionData = z.infer<typeof CommandOptionDataSchema>;

/**
 * Schema for the `command` metadata object inside Discord documentation MDX frontmatter.
 *
 * This acts as the Single Source of Truth (SSOT) for both the documentation site
 * and Discord's `SlashCommandBuilder` registration.
 */
export const DiscordCommandManifestDataSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(32)
    .regex(
      /^[a-z0-9_-]+$/,
      "Command name must be lowercase alphanumeric, hyphen, or underscore"
    ),
  description: z.string().min(1).max(100),
  dmPermission: z.boolean().default(false),
  options: z.array(CommandOptionDataSchema).max(25).default([]),
});

/**
 * Inferred TypeScript type for a Discord command manifest.
 */
export type DiscordCommandManifestData = z.infer<
  typeof DiscordCommandManifestDataSchema
>;

/**
 * Full frontmatter schema for a Discord command MDX documentation page.
 */
export const CommandDocFrontmatterDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  command: DiscordCommandManifestDataSchema,
});

/**
 * Inferred TypeScript type for a Discord command MDX documentation frontmatter.
 */
export type CommandDocFrontmatterData = z.infer<
  typeof CommandDocFrontmatterDataSchema
>;
