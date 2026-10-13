import type { ICharacter20th } from "./character-20th.definitions";

import { z } from "zod";
import {
  Character20thDataSchema,
  Character20thSheetSchema,
} from "./character-20th.definitions";
import { Splat } from "../character.definitions";
import {
  ConsumableTrackerDataSchema,
  CounterTrackerDataSchema,
} from "../trackers";
import type { ConsumableTrackerData, CounterTrackerData } from "../trackers";

// ============================================================================
// 20th Edition Demon Character Constraints & Schema
// ============================================================================

export const Demon20thConstraints = {
  Faith: { min: 0, max: 10 },
  Torment: { min: 0, max: 10 },
} as const;

export const Demon20thFaithSchema = ConsumableTrackerDataSchema.and(
  z.object({
    total: z.int().min(1).max(Demon20thConstraints.Faith.max),
    current: z.int().min(0).max(Demon20thConstraints.Faith.max),
  })
);

/**
 * Demon 20th Edition sheet schema (stored in characters.data JSONB).
 */
export const Demon20thSheetSchema = Character20thSheetSchema.extend({
  faith: Demon20thFaithSchema.default({ total: 10, current: 6 }),
  torment: CounterTrackerDataSchema.default({ permanent: 5, temporary: 0 }),
});
export type Demon20thSheetData = z.infer<typeof Demon20thSheetSchema>;

/**
 * Complete Demon 20th Edition character DTO schema (Metadata + Sheet).
 */
export const Demon20thDataSchema = Character20thDataSchema.extend({
  splat: z.literal(Splat.Demon20th),
  faith: Demon20thFaithSchema.default({ total: 10, current: 6 }),
  torment: CounterTrackerDataSchema.default({ permanent: 5, temporary: 0 }),
});
export type Demon20thData = z.infer<typeof Demon20thDataSchema>;

// ============================================================================
// 20th Edition Demon Character Entity Interface
// ============================================================================

export interface IDemon20th extends ICharacter20th {
  get faith(): ConsumableTrackerData;
  get torment(): CounterTrackerData;

  spendFaith(amount?: number): void;
  gainFaith(amount?: number): void;
  setFaith(current: number, total?: number): void;

  gainTorment(temporary?: number): void;
  setTorment(permanent: number, temporary?: number): void;

  toData(): Demon20thData;
}
