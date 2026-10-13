import { z } from "zod";
import { SnowflakeSchema } from "@realm/common";

/**
 * Steps in the interactive `/chronicle` workflow.
 */
export const ChronicleWorkflowStep = {
  Dashboard: "dashboard",
  SelectActiveChronicle: "select_active_chronicle",
  SelectVersion: "select_version",
  ManageStorytellers: "manage_storytellers",
  ConfirmDelete: "confirm_delete",
} as const;

/**
 * Zod schema for validating chronicle workflow steps.
 */
export const ChronicleWorkflowStepSchema = z.enum(ChronicleWorkflowStep);

/**
 * Inferred TypeScript type for chronicle workflow steps.
 */
export type ChronicleWorkflowStep = z.infer<typeof ChronicleWorkflowStepSchema>;

/**
 * Controls that can be triggered from the `/chronicle` Components V2 views.
 */
export const ChronicleControl = {
  NavBack: "nav_back",
  OpenSwitchChronicle: "open_switch_chronicle",
  SwitchChronicleMenu: "switch_chronicle_menu",
  OpenVersionMenu: "open_version_menu",
  SelectVersionMenu: "select_version_menu",
  OpenStorytellers: "open_storytellers",
  AddStorytellerRoleMenu: "add_st_role_menu",
  RemoveStorytellerRoleMenu: "remove_st_role_menu",
  AddStorytellerUserMenu: "add_st_user_menu",
  RemoveStorytellerUserMenu: "remove_st_user_menu",
  OpenCreateModal: "open_create_modal",
  SubmitCreateModal: "submit_create_modal",
  OpenDeleteConfirm: "open_delete_confirm",
  ConfirmDeleteYes: "confirm_delete_yes",
  ConfirmDeleteCancel: "confirm_delete_cancel",
} as const;

/**
 * Zod schema for validating chronicle interaction control identifiers.
 */
export const ChronicleControlSchema = z.enum(ChronicleControl);

/**
 * Inferred TypeScript type for chronicle interaction control identifiers.
 */
export type ChronicleControl = z.infer<typeof ChronicleControlSchema>;

/**
 * Schema for chronicle session state stored inside PostgreSQL `interaction_sessions`.
 */
export const ChronicleSessionStateDataSchema = z.object({
  guildId: SnowflakeSchema,
  activeChronicleId: SnowflakeSchema,
  history: z.array(ChronicleWorkflowStepSchema).default([]),
  lastActionBanner: z.string().optional(),
});

/**
 * Inferred TypeScript type for the `/chronicle` PostgreSQL session state.
 */
export type ChronicleSessionStateData = z.infer<
  typeof ChronicleSessionStateDataSchema
>;
