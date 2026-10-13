import { z } from "zod";

/**
 * Zod schema for Mage 20th Quintessence and Paradox combined 20-box wheel.
 * The invariant rule states: quintessence + paradox <= 20.
 */
export const QuintessenceParadoxDataSchema = z
  .object({
    quintessence: z.int().min(0).max(20).default(5),
    paradox: z.int().min(0).max(20).default(0),
  })
  .refine((data) => data.quintessence + data.paradox <= 20, {
    message: "The combined total of Paradox and Quintessence cannot exceed 20",
    path: ["quintessence"],
  });

export type QuintessenceParadoxData = z.infer<
  typeof QuintessenceParadoxDataSchema
>;
