import type { ICharacter20th } from "./character-20th.definitions";

import { z } from "zod";
import {
  Character20thDataSchema,
  Character20thSheetSchema,
} from "./character-20th.definitions";
import { Splat } from "../character.definitions";

// ============================================================================
// 20th Edition Human Character Schema
// ============================================================================

/**
 * Human 20th Edition sheet schema (stored in characters.data JSONB).
 */
export const Human20thSheetSchema = Character20thSheetSchema.extend({
  blood: z.int().min(0).max(10).default(10),
  humanity: z.int().min(0).max(10).default(7),
});
export type Human20thSheetData = z.infer<typeof Human20thSheetSchema>;

/**
 * Complete Human 20th Edition character DTO schema (Metadata + Sheet).
 */
export const Human20thDataSchema = Character20thDataSchema.extend({
  splat: z.literal(Splat.Human20th),
  blood: z.int().min(0).max(10).default(10),
  humanity: z.int().min(0).max(10).default(7),
});
export type Human20thData = z.infer<typeof Human20thDataSchema>;

// ============================================================================
// 20th Edition Human Character Entity Interface
// ============================================================================

export interface IHuman20th extends ICharacter20th {
  get blood(): number;
  get humanity(): number;

  setBlood(value: number): void;
  setHumanity(value: number): void;

  toData(): Human20thData;
}
