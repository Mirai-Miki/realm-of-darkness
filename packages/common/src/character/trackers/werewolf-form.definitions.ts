import { z } from "zod";

/**
 * Werewolf 5th edition shapeshifting forms.
 */
export const WerewolfForm = {
  Homid: "Homid",
  Glabro: "Glabro",
  Crinos: "Crinos",
  Hispo: "Hispo",
  Lupus: "Lupus",
} as const;

export const WerewolfFormSchema = z.enum(WerewolfForm);
export type WerewolfForm = z.infer<typeof WerewolfFormSchema>;
