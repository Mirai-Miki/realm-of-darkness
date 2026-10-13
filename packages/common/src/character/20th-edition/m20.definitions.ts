import type { ICharacter20th } from "./character-20th.definitions";

import { z } from "zod";
import {
  Character20thDataSchema,
  Character20thSheetSchema,
} from "./character-20th.definitions";
import { Splat } from "../character.definitions";
import { QuintessenceParadoxDataSchema } from "../trackers";
import type { QuintessenceParadoxData } from "../trackers";

// ============================================================================
// 20th Edition Mage Character Constraints & Schema
// ============================================================================

export const Mage20thConstraints = {
  Arete: { min: 0, max: 10 },
  Quintessence: { min: 0, max: 20 },
  Paradox: { min: 0, max: 20 },
} as const;

export const Arete20thSchema = z
  .int()
  .min(Mage20thConstraints.Arete.min)
  .max(Mage20thConstraints.Arete.max);

/**
 * Mage 20th Edition sheet schema (stored in characters.data JSONB).
 */
export const Mage20thSheetSchema = Character20thSheetSchema.extend({
  arete: Arete20thSchema.default(1),
  quintessence: QuintessenceParadoxDataSchema.default({
    quintessence: 5,
    paradox: 0,
  }),
});
export type Mage20thSheetData = z.infer<typeof Mage20thSheetSchema>;

/**
 * Complete Mage 20th Edition character DTO schema (Metadata + Sheet).
 */
export const Mage20thDataSchema = Character20thDataSchema.extend({
  splat: z.literal(Splat.Mage20th),
  arete: Arete20thSchema.default(1),
  quintessence: QuintessenceParadoxDataSchema.default({
    quintessence: 5,
    paradox: 0,
  }),
});
export type Mage20thData = z.infer<typeof Mage20thDataSchema>;

// ============================================================================
// 20th Edition Mage Character Entity Interface
// ============================================================================

export interface IMage20th extends ICharacter20th {
  get arete(): number;
  get quintessence(): QuintessenceParadoxData;

  setArete(value: number): void;
  spendQuintessence(amount?: number): void;
  gainQuintessence(amount?: number): void;
  gainParadox(amount?: number): void;
  dischargeParadox(amount?: number): void;
  setQuintessenceAndParadox(quintessence: number, paradox: number): void;

  toData(): Mage20thData;
}
