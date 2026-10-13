import { z } from "zod";
import { SnowflakeSchema } from "@realm/common";

/**
 * Steps in the interactive `/guild` workflow.
 */
export const GuildWorkflowStep = {
  Dashboard: "dashboard",
  ManageStorytellers: "manage_storytellers",
} as const;

/**
 * Zod schema for validating guild workflow steps.
 */
export const GuildWorkflowStepSchema = z.enum(GuildWorkflowStep);

/**
 * Inferred TypeScript type for guild workflow steps.
 */
export type GuildWorkflowStep = z.infer<typeof GuildWorkflowStepSchema>;

/**
 * Controls that can be triggered from the `/guild` Components V2 views.
 */
export const GuildControl = {
  NavBack: "nav_back",
  OpenStorytellers: "open_storytellers",
  AddServerRoleMenu: "add_server_role_menu",
  AddServerUserMenu: "add_server_user_menu",
} as const;

/**
 * Zod schema for validating guild interaction control identifiers.
 */
export const GuildControlSchema = z.enum(GuildControl);

/**
 * Inferred TypeScript type for guild interaction control identifiers.
 */
export type GuildControl = z.infer<typeof GuildControlSchema>;

/**
 * Schema for guild session state stored inside PostgreSQL `interaction_sessions`.
 */
export const GuildSessionStateDataSchema = z.object({
  guildId: SnowflakeSchema,
  history: z.array(GuildWorkflowStepSchema).default([]),
  lastActionBanner: z.string().optional(),
});

/**
 * Inferred TypeScript type for the `/guild` PostgreSQL session state.
 */
export type GuildSessionStateData = z.infer<typeof GuildSessionStateDataSchema>;
