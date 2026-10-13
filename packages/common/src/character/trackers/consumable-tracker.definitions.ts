import { z } from "zod";

/**
 * Zod schema for bounded consumable tracker data (e.g., Blood, Gnosis, Willpower).
 * Current value cannot exceed the total pool value.
 */
export const ConsumableTrackerDataSchema = z
  .object({
    total: z.int().min(0),
    current: z.int().min(0),
  })
  .refine((data) => data.current <= data.total, {
    message: "Current consumable pool cannot exceed total",
    path: ["current"],
  });

export type ConsumableTrackerData = z.infer<typeof ConsumableTrackerDataSchema>;

/**
 * Zod schema for unlocked consumable tracker data (e.g., Werewolf 20th Rage).
 * In unlocked pools, the current value may exceed total up to a maximum cap.
 */
export const UnlockedConsumableTrackerDataSchema = z.object({
  total: z.int().min(0),
  current: z.int().min(0),
});

export type UnlockedConsumableTrackerData = z.infer<
  typeof UnlockedConsumableTrackerDataSchema
>;
