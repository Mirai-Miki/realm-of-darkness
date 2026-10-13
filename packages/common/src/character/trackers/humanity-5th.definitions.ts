import { z } from "zod";

/**
 * Zod schema for 5th Edition Humanity and Stains tracker.
 * Total humanity is 0-10, and stains accumulate up to 10.
 */
export const Humanity5thDataSchema = z.object({
  total: z.int().min(0).max(10).default(7),
  stains: z.int().min(0).max(10).default(0),
});

export type Humanity5thData = z.infer<typeof Humanity5thDataSchema>;
