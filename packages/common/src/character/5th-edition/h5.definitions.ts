import type { ICharacter5th } from "./character-5th.definitions";

import { z } from "zod";
import {
  Character5thDataSchema,
  Character5thSheetSchema,
} from "./character-5th.definitions";
import { Splat } from "../character.definitions";

// ============================================================================
// 5th Edition Hunter Character Constraints & Schema
// ============================================================================

export const Hunter5thConstraints = {
  Desperation: { min: 1, max: 5 },
  Danger: { min: 1, max: 5 },
} as const;

export const Desperation5thSchema = z
  .int()
  .min(Hunter5thConstraints.Desperation.min)
  .max(Hunter5thConstraints.Desperation.max);

export const Danger5thSchema = z
  .int()
  .min(Hunter5thConstraints.Danger.min)
  .max(Hunter5thConstraints.Danger.max);

/**
 * Hunter 5th Edition sheet schema (stored in characters.data JSONB).
 */
export const Hunter5thSheetSchema = Character5thSheetSchema.extend({
  desperation: Desperation5thSchema.default(1),
  danger: Danger5thSchema.default(1),
  despair: z.boolean().default(false),
});
export type Hunter5thSheetData = z.infer<typeof Hunter5thSheetSchema>;

/**
 * Complete Hunter 5th Edition character DTO schema (Metadata + Sheet).
 */
export const Hunter5thDataSchema = Character5thDataSchema.extend({
  splat: z.literal(Splat.Hunter5th),
  desperation: Desperation5thSchema.default(1),
  danger: Danger5thSchema.default(1),
  despair: z.boolean().default(false),
});
export type Hunter5thData = z.infer<typeof Hunter5thDataSchema>;

// ============================================================================
// 5th Edition Hunter Character Entity Interface
// ============================================================================

export interface IHunter5th extends ICharacter5th {
  get desperation(): number;
  get danger(): number;
  get despair(): boolean;

  setDesperation(value: number): void;
  increaseDesperation(amount?: number): void;
  decreaseDesperation(amount?: number): void;

  setDanger(value: number): void;
  increaseDanger(amount?: number): void;
  decreaseDanger(amount?: number): void;

  setDespair(value: boolean): void;

  toData(): Hunter5thData;
}
