import type { ICharacter5th } from "./character-5th.definitions";

import { z } from "zod";
import {
  Character5thDataSchema,
  Character5thSheetSchema,
} from "./character-5th.definitions";
import { Splat } from "../character.definitions";
import { Humanity5thDataSchema } from "../trackers";
import type { Humanity5thData } from "../trackers";

// ============================================================================
// 5th Edition Ghoul Character Schema
// ============================================================================

/**
 * Ghoul 5th Edition sheet schema (stored in characters.data JSONB).
 */
export const Ghoul5thSheetSchema = Character5thSheetSchema.extend({
  humanity: Humanity5thDataSchema.default({ total: 7, stains: 0 }),
});
export type Ghoul5thSheetData = z.infer<typeof Ghoul5thSheetSchema>;

/**
 * Complete Ghoul 5th Edition character DTO schema (Metadata + Sheet).
 */
export const Ghoul5thDataSchema = Character5thDataSchema.extend({
  splat: z.literal(Splat.Ghoul5th),
  humanity: Humanity5thDataSchema.default({ total: 7, stains: 0 }),
});
export type Ghoul5thData = z.infer<typeof Ghoul5thDataSchema>;

// ============================================================================
// 5th Edition Ghoul Character Entity Interface
// ============================================================================

export interface IGhoul5th extends ICharacter5th {
  get humanity(): Humanity5thData;

  setHumanity(total: number, stains?: number): void;
  takeStains(amount: number): void;

  toData(): Ghoul5thData;
}
