import type { ICharacter5th } from "./character-5th.definitions";

import { z } from "zod";
import {
  Character5thDataSchema,
  Character5thSheetSchema,
} from "./character-5th.definitions";
import { Splat } from "../character.definitions";
import { WerewolfFormSchema } from "../trackers";
import type { WerewolfForm } from "../trackers";

// ============================================================================
// 5th Edition Werewolf Character Constraints & Schema
// ============================================================================

export const Werewolf5thConstraints = {
  Rage: { min: 0, max: 5 },
  Harano: { min: 0, max: 5 },
  Hauglosk: { min: 0, max: 5 },
} as const;

export const Rage5thSchema = z
  .int()
  .min(Werewolf5thConstraints.Rage.min)
  .max(Werewolf5thConstraints.Rage.max);

export const Harano5thSchema = z
  .int()
  .min(Werewolf5thConstraints.Harano.min)
  .max(Werewolf5thConstraints.Harano.max);

export const Hauglosk5thSchema = z
  .int()
  .min(Werewolf5thConstraints.Hauglosk.min)
  .max(Werewolf5thConstraints.Hauglosk.max);

/**
 * Werewolf 5th Edition sheet schema (stored in characters.data JSONB).
 */
export const Werewolf5thSheetSchema = Character5thSheetSchema.extend({
  rage: Rage5thSchema.default(1),
  harano: Harano5thSchema.default(0),
  hauglosk: Hauglosk5thSchema.default(0),
  form: WerewolfFormSchema.default("Homid"),
});
export type Werewolf5thSheetData = z.infer<typeof Werewolf5thSheetSchema>;

/**
 * Complete Werewolf 5th Edition character DTO schema (Metadata + Sheet).
 */
export const Werewolf5thDataSchema = Character5thDataSchema.extend({
  splat: z.literal(Splat.Werewolf5th),
  rage: Rage5thSchema.default(1),
  harano: Harano5thSchema.default(0),
  hauglosk: Hauglosk5thSchema.default(0),
  form: WerewolfFormSchema.default("Homid"),
});
export type Werewolf5thData = z.infer<typeof Werewolf5thDataSchema>;

// ============================================================================
// 5th Edition Werewolf Character Entity Interface
// ============================================================================

export interface IWerewolf5th extends ICharacter5th {
  get rage(): number;
  get harano(): number;
  get hauglosk(): number;
  get form(): WerewolfForm;

  setRage(value: number): void;
  increaseRage(amount?: number): void;
  decreaseRage(amount?: number): void;

  setHarano(value: number): void;
  setHauglosk(value: number): void;
  setForm(form: WerewolfForm): void;

  toData(): Werewolf5thData;
}
