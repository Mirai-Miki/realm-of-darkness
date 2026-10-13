import type { ICharacter20th } from "./character-20th.definitions";

import { z } from "zod";
import {
  Character20thDataSchema,
  Character20thSheetSchema,
} from "./character-20th.definitions";
import { Splat } from "../character.definitions";

// ============================================================================
// 20th Edition Ghoul Character Schema
// ============================================================================

/**
 * Ghoul 20th Edition sheet schema (stored in characters.data JSONB).
 */
export const Ghoul20thSheetSchema = Character20thSheetSchema.extend({
  blood: z.int().min(0).max(10).default(10),
  vitae: z.int().min(0).max(5).default(1),
  humanity: z.int().min(0).max(10).default(7),
});
export type Ghoul20thSheetData = z.infer<typeof Ghoul20thSheetSchema>;

/**
 * Complete Ghoul 20th Edition character DTO schema (Metadata + Sheet).
 */
export const Ghoul20thDataSchema = Character20thDataSchema.extend({
  splat: z.literal(Splat.Ghoul20th),
  blood: z.int().min(0).max(10).default(10),
  vitae: z.int().min(0).max(5).default(1),
  humanity: z.int().min(0).max(10).default(7),
});
export type Ghoul20thData = z.infer<typeof Ghoul20thDataSchema>;

// ============================================================================
// 20th Edition Ghoul Character Entity Interface
// ============================================================================

export interface IGhoul20th extends ICharacter20th {
  get blood(): number;
  get vitae(): number;
  get humanity(): number;

  setBlood(value: number): void;
  setVitae(value: number): void;
  spendVitae(amount?: number): void;
  gainVitae(amount?: number): void;
  setHumanity(value: number): void;

  toData(): Ghoul20thData;
}
