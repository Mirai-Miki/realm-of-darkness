import type { ICharacter5th } from "./character-5th.definitions";

import { z } from "zod";
import {
  Character5thDataSchema,
  Character5thSheetSchema,
} from "./character-5th.definitions";
import { Splat } from "../character.definitions";
import { Humanity5thDataSchema } from "../trackers";

// ===========================================================================
// 5th Edition Vampire Character Constraints & Schema
// ===========================================================================

export const Vampire5thConstraints = {
  DateOfDeath: { min: 0, max: 20 },
  ApparentAge: { min: 0, max: 50 },
  Sire: { min: 0, max: 50 },
  Hunger: { min: 0, max: 5 },
  BloodPotency: { min: 0, max: 10 },
  Generation: { min: 1, max: 18 },
} as const;

// Individual field schemas for validation
export const HungerDataSchema = z
  .int()
  .min(Vampire5thConstraints.Hunger.min)
  .max(Vampire5thConstraints.Hunger.max);

// Schema for validating hunger increase/decrease amounts
export const HungerAmountSchema = z.int().min(0).max(5);

/**
 * Vampire 5th Edition sheet schema (stored in characters.data JSONB).
 */
export const Vampire5thSheetSchema = Character5thSheetSchema.extend({
  hunger: HungerDataSchema.default(1),
  humanity: Humanity5thDataSchema.default({ total: 7, stains: 0 }),
  bloodPotency: z
    .int()
    .min(Vampire5thConstraints.BloodPotency.min)
    .max(Vampire5thConstraints.BloodPotency.max)
    .default(0),
  generation: z
    .int()
    .min(Vampire5thConstraints.Generation.min)
    .max(Vampire5thConstraints.Generation.max)
    .default(13),
});
export type Vampire5thSheetData = z.infer<typeof Vampire5thSheetSchema>;

/**
 * Complete Vampire 5th Edition character DTO schema (Metadata + Sheet).
 */
export const Vampire5thDataSchema = Character5thDataSchema.extend({
  splat: z.literal(Splat.Vampire5th),
  hunger: HungerDataSchema.default(1),
  humanity: Humanity5thDataSchema.default({ total: 7, stains: 0 }),
  bloodPotency: z
    .int()
    .min(Vampire5thConstraints.BloodPotency.min)
    .max(Vampire5thConstraints.BloodPotency.max)
    .default(0),
  generation: z
    .int()
    .min(Vampire5thConstraints.Generation.min)
    .max(Vampire5thConstraints.Generation.max)
    .default(13),
});
export type Vampire5thData = z.infer<typeof Vampire5thDataSchema>;

// ============================================================================
// 5th Edition Vampire Character Entity Interface
// ============================================================================

/**
 * Vampire 5th Edition character interface.
 * Extends 5th Edition base with vampire-specific mechanics.
 */
export interface IVampire5th extends ICharacter5th {
  get hunger(): number;

  // Vampire-specific methods
  increaseHunger(amount?: number): number;
  decreaseHunger(amount?: number): number;
  setHunger(value: number): number;

  toData(): Vampire5thData;
}
