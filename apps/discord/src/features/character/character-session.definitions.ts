import { z } from "zod";
import { SplatSchema } from "@realm/common";

/**
 * Steps in the stateless `/character` workflow.
 */
export const CharacterWorkflowStep = {
  ConfirmCreate: "confirm_create",
  SelectSplat: "select_splat",
  SelectClan: "select_clan",
  EditorHome: "editor_home",
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
  ConfirmCreateYes: "confirm_yes",
  ConfirmCreateCancel: "confirm_cancel",
  SelectSplatMenu: "splat_menu",
  SelectClanMenu: "clan_menu",
  DecreaseHunger: "dec_hunger",
  IncreaseHunger: "inc_hunger",
  DecreaseWillpower: "dec_wp",
  IncreaseWillpower: "inc_wp",
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
 * Schema for the mock character sheet state stored inside the PostgreSQL
 * `interaction_sessions` JSONB column during the `/character` flow.
 */
export const CharacterSessionStateDataSchema = z.object({
  characterName: z.string().min(2).max(50),
  splat: SplatSchema.optional(),
  clan: z.string().min(1).max(50).optional(),
  concept: z.string().max(100).default("Unwritten Soul"),
  ambition: z.string().max(150).default("Survive the night"),
  generation: z.number().int().min(4).max(16).default(13),
  hunger: z.number().int().min(0).max(5).default(1),
  healthMax: z.number().int().min(1).max(15).default(6),
  healthSuperficial: z.number().int().min(0).max(15).default(0),
  willpowerMax: z.number().int().min(1).max(15).default(5),
  willpowerSuperficial: z.number().int().min(0).max(15).default(1),
  lastActionBanner: z.string().optional(),
});

/**
 * Inferred TypeScript type for the `/character` PostgreSQL session state.
 */
export type CharacterSessionStateData = z.infer<
  typeof CharacterSessionStateDataSchema
>;
