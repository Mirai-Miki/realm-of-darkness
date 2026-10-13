import type {
  HealthTracker20thData,
  ICharacter20th,
} from "./character-20th.definitions";

import { z } from "zod";
import {
  Character20thDataSchema,
  Character20thSheetSchema,
  HealthTracker20thDataSchema,
} from "./character-20th.definitions";
import { Splat } from "../character.definitions";
import {
  ConsumableTrackerDataSchema,
  CounterTrackerDataSchema,
} from "../trackers";
import type { ConsumableTrackerData, CounterTrackerData } from "../trackers";

// ============================================================================
// 20th Edition Changeling Character Constraints & Schema
// ============================================================================

export const Changeling20thConstraints = {
  Glamour: { min: 1, max: 10 },
  Banality: { min: 1, max: 10 },
} as const;

export const Changeling20thGlamourSchema = ConsumableTrackerDataSchema.and(
  z.object({
    total: z.int().min(1).max(Changeling20thConstraints.Glamour.max),
    current: z.int().min(1).max(Changeling20thConstraints.Glamour.max),
  })
);

/**
 * Changeling 20th Edition sheet schema (stored in characters.data JSONB).
 */
export const Changeling20thSheetSchema = Character20thSheetSchema.extend({
  glamour: Changeling20thGlamourSchema.default({ total: 4, current: 4 }),
  banality: CounterTrackerDataSchema.default({ permanent: 3, temporary: 0 }),
  nightmare: CounterTrackerDataSchema.default({ permanent: 0, temporary: 0 }),
  chimericalHealth: HealthTracker20thDataSchema.default({
    total: 7,
    bashing: 0,
    lethal: 0,
    aggravated: 0,
  }),
});
export type Changeling20thSheetData = z.infer<typeof Changeling20thSheetSchema>;

/**
 * Complete Changeling 20th Edition character DTO schema (Metadata + Sheet).
 */
export const Changeling20thDataSchema = Character20thDataSchema.extend({
  splat: z.literal(Splat.Changeling20th),
  glamour: Changeling20thGlamourSchema.default({ total: 4, current: 4 }),
  banality: CounterTrackerDataSchema.default({ permanent: 3, temporary: 0 }),
  nightmare: CounterTrackerDataSchema.default({ permanent: 0, temporary: 0 }),
  chimericalHealth: HealthTracker20thDataSchema.default({
    total: 7,
    bashing: 0,
    lethal: 0,
    aggravated: 0,
  }),
});
export type Changeling20thData = z.infer<typeof Changeling20thDataSchema>;

// ============================================================================
// 20th Edition Changeling Character Entity Interface
// ============================================================================

export interface IChangeling20th extends ICharacter20th {
  get glamour(): ConsumableTrackerData;
  get banality(): CounterTrackerData;
  get nightmare(): CounterTrackerData;
  get chimericalHealth(): HealthTracker20thData;

  spendGlamour(amount?: number): void;
  gainGlamour(amount?: number): void;
  setGlamour(current: number, total?: number): void;

  gainBanality(temporary?: number): void;
  setBanality(permanent: number, temporary?: number): void;

  gainNightmare(temporary?: number): void;
  setNightmare(imbalance: number, nightmare?: number): void;

  toData(): Changeling20thData;
}
