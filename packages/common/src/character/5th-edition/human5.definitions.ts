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
// 5th Edition Human Character Schema
// ============================================================================

/**
 * Human 5th Edition sheet schema (stored in characters.data JSONB).
 */
export const Human5thSheetSchema = Character5thSheetSchema.extend({
  humanity: Humanity5thDataSchema.default({ total: 7, stains: 0 }),
});
export type Human5thSheetData = z.infer<typeof Human5thSheetSchema>;

/**
 * Complete Human 5th Edition character DTO schema (Metadata + Sheet).
 */
export const Human5thDataSchema = Character5thDataSchema.extend({
  splat: z.literal(Splat.Human5th),
  humanity: Humanity5thDataSchema.default({ total: 7, stains: 0 }),
});
export type Human5thData = z.infer<typeof Human5thDataSchema>;

// ============================================================================
// 5th Edition Human Character Entity Interface
// ============================================================================

export interface IHuman5th extends ICharacter5th {
  get humanity(): Humanity5thData;

  setHumanity(total: number, stains?: number): void;
  takeStains(amount: number): void;

  toData(): Human5thData;
}
