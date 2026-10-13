import type { ICharacter20th } from "./character-20th.definitions";

import { z } from "zod";
import {
  Character20thDataSchema,
  Character20thSheetSchema,
} from "./character-20th.definitions";
import { Splat } from "../character.definitions";
import { ConsumableTrackerDataSchema } from "../trackers";
import type { ConsumableTrackerData } from "../trackers";

// ============================================================================
// 20th Edition Wraith Character Constraints & Schema
// ============================================================================

export const Wraith20thConstraints = {
  Corpus: { min: 0, max: 20 },
  Pathos: { min: 0, max: 10 },
} as const;

export const Wraith20thCorpusSchema = ConsumableTrackerDataSchema.and(
  z.object({
    total: z.int().min(1).max(Wraith20thConstraints.Corpus.max),
    current: z.int().min(0).max(Wraith20thConstraints.Corpus.max),
  })
);

export const Wraith20thPathosSchema = ConsumableTrackerDataSchema.and(
  z.object({
    total: z.int().min(1).max(Wraith20thConstraints.Pathos.max),
    current: z.int().min(0).max(Wraith20thConstraints.Pathos.max),
  })
);

/**
 * Wraith 20th Edition sheet schema (stored in characters.data JSONB).
 */
export const Wraith20thSheetSchema = Character20thSheetSchema.extend({
  corpus: Wraith20thCorpusSchema.default({ total: 10, current: 10 }),
  pathos: Wraith20thPathosSchema.default({ total: 10, current: 5 }),
});
export type Wraith20thSheetData = z.infer<typeof Wraith20thSheetSchema>;

/**
 * Complete Wraith 20th Edition character DTO schema (Metadata + Sheet).
 */
export const Wraith20thDataSchema = Character20thDataSchema.extend({
  splat: z.literal(Splat.Wraith20th),
  corpus: Wraith20thCorpusSchema.default({ total: 10, current: 10 }),
  pathos: Wraith20thPathosSchema.default({ total: 10, current: 5 }),
});
export type Wraith20thData = z.infer<typeof Wraith20thDataSchema>;

// ============================================================================
// 20th Edition Wraith Character Entity Interface
// ============================================================================

export interface IWraith20th extends ICharacter20th {
  get corpus(): ConsumableTrackerData;
  get pathos(): ConsumableTrackerData;

  spendCorpus(amount?: number): void;
  gainCorpus(amount?: number): void;
  setCorpus(current: number, total?: number): void;

  spendPathos(amount?: number): void;
  gainPathos(amount?: number): void;
  setPathos(current: number, total?: number): void;

  toData(): Wraith20thData;
}
