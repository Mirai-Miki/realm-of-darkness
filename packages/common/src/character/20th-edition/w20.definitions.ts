import type { ICharacter20th } from "./character-20th.definitions";

import { z } from "zod";
import {
  Character20thDataSchema,
  Character20thSheetSchema,
} from "./character-20th.definitions";
import { Splat } from "../character.definitions";
import {
  ConsumableTrackerDataSchema,
  UnlockedConsumableTrackerDataSchema,
} from "../trackers";
import type {
  ConsumableTrackerData,
  UnlockedConsumableTrackerData,
} from "../trackers";

// ============================================================================
// 20th Edition Werewolf Character Constraints & Schema
// ============================================================================

export const Werewolf20thConstraints = {
  Rage: { min: 0, max: 10 },
  Gnosis: { min: 0, max: 10 },
} as const;

export const Werewolf20thRageSchema =
  UnlockedConsumableTrackerDataSchema.extend({
    total: z.int().min(1).max(Werewolf20thConstraints.Rage.max),
    current: z.int().min(0).max(Werewolf20thConstraints.Rage.max),
  });

export const Werewolf20thGnosisSchema = ConsumableTrackerDataSchema.and(
  z.object({
    total: z.int().min(1).max(Werewolf20thConstraints.Gnosis.max),
    current: z.int().min(0).max(Werewolf20thConstraints.Gnosis.max),
  })
);

/**
 * Werewolf 20th Edition sheet schema (stored in characters.data JSONB).
 */
export const Werewolf20thSheetSchema = Character20thSheetSchema.extend({
  rage: Werewolf20thRageSchema.default({ total: 7, current: 7 }),
  gnosis: Werewolf20thGnosisSchema.default({ total: 7, current: 7 }),
});
export type Werewolf20thSheetData = z.infer<typeof Werewolf20thSheetSchema>;

/**
 * Complete Werewolf 20th Edition character DTO schema (Metadata + Sheet).
 */
export const Werewolf20thDataSchema = Character20thDataSchema.extend({
  splat: z.literal(Splat.Werewolf20th),
  rage: Werewolf20thRageSchema.default({ total: 7, current: 7 }),
  gnosis: Werewolf20thGnosisSchema.default({ total: 7, current: 7 }),
});
export type Werewolf20thData = z.infer<typeof Werewolf20thDataSchema>;

// ============================================================================
// 20th Edition Werewolf Character Entity Interface
// ============================================================================

export interface IWerewolf20th extends ICharacter20th {
  get rage(): UnlockedConsumableTrackerData;
  get gnosis(): ConsumableTrackerData;

  spendRage(amount?: number): void;
  gainRage(amount?: number): void;
  setRage(current: number, total?: number): void;

  spendGnosis(amount?: number): void;
  gainGnosis(amount?: number): void;
  setGnosis(current: number, total?: number): void;

  toData(): Werewolf20thData;
}
