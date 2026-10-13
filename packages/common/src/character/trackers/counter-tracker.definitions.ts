import { z } from "zod";

/**
 * Zod schema for dual permanent/temporary counters (e.g. Banality, Torment, Nightmare/Imbalance).
 * Holds a permanent rating (primary) and an accumulated temporary rating (secondary).
 */
export const CounterTrackerDataSchema = z.object({
  permanent: z.int().min(0).max(10).default(0),
  temporary: z.int().min(0).max(10).default(0),
});

export type CounterTrackerData = z.infer<typeof CounterTrackerDataSchema>;
