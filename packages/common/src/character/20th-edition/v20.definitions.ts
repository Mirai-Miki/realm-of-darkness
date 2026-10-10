import type { ICharacter20th } from "./character-20th.definitions";

import { z } from "zod";
import {
  Character20thDataSchema,
  Character20thSheetSchema,
} from "./character-20th.definitions";
import { Splat } from "../character.definitions";

// ===========================================================================
// 20th Edition Vampire Character Constraints & Schema
// ===========================================================================

export const Vampire20thConstraints = {
  BloodPoolCurrent: { min: 0, max: 50 },
  BloodPoolTotal: { min: 1, max: 50 },
  MoralityValue: { min: 0, max: 10 },
  MortalityName: { minLength: 1, maxLength: 50 },
} as const;

export const BloodTrackerDataSchema = z
  .object({
    current: z
      .int()
      .min(Vampire20thConstraints.BloodPoolCurrent.min)
      .max(Vampire20thConstraints.BloodPoolCurrent.max),
    total: z
      .int()
      .min(Vampire20thConstraints.BloodPoolTotal.min)
      .max(Vampire20thConstraints.BloodPoolTotal.max),
  })
  .refine((data) => data.current <= data.total, {
    message: "Current blood cannot exceed maximum blood",
    path: ["current"],
  });
export type BloodTrackerData = z.infer<typeof BloodTrackerDataSchema>;

export const MoralityDataSchema = z
  .object({
    value: z
      .int()
      .min(Vampire20thConstraints.MoralityValue.min)
      .max(Vampire20thConstraints.MoralityValue.max),
    name: z
      .string()
      .min(Vampire20thConstraints.MortalityName.minLength)
      .max(Vampire20thConstraints.MortalityName.maxLength),
  })
  .refine((data) => data.value <= 10, {
    message: "Morality cannot exceed 10",
    path: ["value"],
  });
export type MoralityData = z.infer<typeof MoralityDataSchema>;

/**
 * Vampire 20th Edition sheet schema (stored in characters.data JSONB).
 */
export const Vampire20thSheetSchema = Character20thSheetSchema.extend({
  bloodPool: BloodTrackerDataSchema,
  morality: MoralityDataSchema,
});
export type Vampire20thSheetData = z.infer<typeof Vampire20thSheetSchema>;

/**
 * Complete Vampire 20th Edition character DTO schema (Metadata + Sheet).
 */
export const Vampire20thDataSchema = Character20thDataSchema.extend({
  splat: z.literal(Splat.Vampire20th),
  bloodPool: BloodTrackerDataSchema,
  morality: MoralityDataSchema,
});
export type Vampire20thData = z.infer<typeof Vampire20thDataSchema>;

// ============================================================================
// 20th Edition Vampire Character Entity Interface
// ============================================================================

/**
 * Vampire 20th Anniversary character interface.
 * Extends 20th Anniversary base with vampire-specific mechanics.
 */
export interface IVampire20th extends ICharacter20th {
  // Blood pool getters
  get bloodPool(): IBloodTracker;
  get morality(): IMoralityTracker;

  // Blood pool methods
  spendBlood(amount: number): void;
  slakeBlood(amount: number): void;
  setCurrentBlood(amount: number): void;
  setBloodPool(current: number, total: number): void;

  // Morality methods
  loseMorality(amount: number): void;
  gainMorality(amount: number): void;
  setCurrentMorality(amount: number): void;
  setMorality(value: number, name: string): void;

  toData(): Vampire20thData;
}

/**
 * Vampire 20th Blood Pool Tracker Value Object
 */
export interface IBloodTracker extends BloodTrackerData {
  readonly current: number;
  readonly total: number;

  spend(amount: number): IBloodTracker;
  slake(amount: number): IBloodTracker;
  setCurrent(amount: number): IBloodTracker;
  setMax(amount: number): IBloodTracker;
}

/**
 * Vampire 20th Morality Tracker Value Object
 * Represents Humanity or Path of Enlightenment rating
 */
export interface IMoralityTracker extends MoralityData {
  readonly current: number;
  readonly total: number;

  lose(amount: number): IMoralityTracker;
  gain(amount: number): IMoralityTracker;
  setValue(amount: number): IMoralityTracker;
  setName(name: string): IMoralityTracker;
}
