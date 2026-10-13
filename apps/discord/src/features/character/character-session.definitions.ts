import { z } from "zod";
import { SnowflakeSchema, SplatSchema } from "@realm/common";

/**
 * Steps in the stateless `/character` workflow.
 */
export const CharacterWorkflowStep = {
  ConfirmCreate: "confirm_create",
  SelectSplat: "select_splat",
  EditorHome: "editor_home",
  TraitsTab: "traits_tab",
  DeleteConfirm: "delete_confirm",
  Cancelled: "cancelled",
} as const;

/**
 * Zod schema for validating character workflow steps.
 */
export const CharacterWorkflowStepSchema = z.enum(CharacterWorkflowStep);

/**
 * Inferred TypeScript type for character workflow steps.
 */
export type CharacterWorkflowStep = z.infer<typeof CharacterWorkflowStepSchema>;

/**
 * Controls that can be triggered from the `/character` Components V2 views.
 */
export const CharacterControl = {
  // Creation Wizard
  ConfirmCreateYes: "confirm_yes",
  ConfirmCreateCancel: "confirm_cancel",
  SelectSplatMenu: "splat_menu",

  // Sheet Tabs
  TabTrackers: "tab_trackers",
  TabTraits: "tab_traits",
  TabDelete: "tab_delete",

  // Character Deletion
  DeleteConfirmYes: "delete_confirm_yes",
  DeleteConfirmCancel: "delete_confirm_cancel",

  // 5th Edition Trackers
  DecreaseHunger: "dec_hunger",
  IncreaseHunger: "inc_hunger",
  DecreaseWillpower: "dec_wp",
  IncreaseWillpower: "inc_wp",
  ShiftCrinos: "shift_crinos",
  ShiftHomid: "shift_homid",
  DecreaseRage: "dec_rage",
  IncreaseRage: "inc_rage",

  // 20th Edition Trackers
  SpendBlood: "spend_blood",
  SlakeBlood: "slake_blood",
  SpendWillpower: "spend_wp",
  RestoreWillpower: "restore_wp",

  // Actions & Modals
  QuickActionMenu: "quick_action",
  EditBioModal: "edit_bio_modal",
} as const;

/**
 * Zod schema for validating character interaction control identifiers.
 */
export const CharacterControlSchema = z.enum(CharacterControl);

/**
 * Inferred TypeScript type for character interaction control identifiers.
 */
export type CharacterControl = z.infer<typeof CharacterControlSchema>;

/**
 * Quick action values available in the Character Editor dropdown menu.
 */
export const CharacterQuickAction = {
  RouseCheck: "rouse_check",
  MendSuperficial: "mend_superficial",
  ShiftCrinos: "shift_crinos",
  ShiftHomid: "shift_homid",
  HealDamage: "heal_damage",
  OpenBioModal: "open_bio_modal",
} as const;

/**
 * Zod schema for validating quick action dropdown selections.
 */
export const CharacterQuickActionSchema = z.enum(CharacterQuickAction);

/**
 * Inferred TypeScript type for quick action dropdown selections.
 */
export type CharacterQuickAction = z.infer<typeof CharacterQuickActionSchema>;

/**
 * Active tab displayed on the character sheet dashboard.
 */
export const CharacterSheetTab = {
  Trackers: "trackers",
  Traits: "traits",
  Delete: "delete",
} as const;

/**
 * Zod schema for character sheet tabs.
 */
export const CharacterSheetTabSchema = z.enum(CharacterSheetTab);

/**
 * Inferred TypeScript type for character sheet tabs.
 */
export type CharacterSheetTab = z.infer<typeof CharacterSheetTabSchema>;

/**
 * Schema for character session context stored inside PostgreSQL
 * `interaction_sessions` JSONB column during `/character` flows.
 */
export const CharacterSessionStateDataSchema = z.object({
  characterId: SnowflakeSchema.optional(),
  characterName: z.string().min(2).max(50),
  splat: SplatSchema.optional(),
  activeTab: CharacterSheetTabSchema.default(CharacterSheetTab.Trackers),
  concept: z.string().max(100).default("Unwritten Soul"),
  ambition: z.string().max(150).default("Survive the night"),
  lastActionBanner: z.string().optional(),
});

/**
 * Inferred TypeScript type for the `/character` PostgreSQL session state.
 */
export type CharacterSessionStateData = z.infer<
  typeof CharacterSessionStateDataSchema
>;
