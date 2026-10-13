import { z } from "zod";

import { Splat } from "./character.definitions";
import {
  Vampire5thDataSchema,
  Vampire5thSheetSchema,
} from "./5th-edition/v5.definitions";
import {
  Werewolf5thDataSchema,
  Werewolf5thSheetSchema,
} from "./5th-edition/w5.definitions";
import {
  Hunter5thDataSchema,
  Hunter5thSheetSchema,
} from "./5th-edition/h5.definitions";
import {
  Human5thDataSchema,
  Human5thSheetSchema,
} from "./5th-edition/human5.definitions";
import {
  Ghoul5thDataSchema,
  Ghoul5thSheetSchema,
} from "./5th-edition/ghoul5.definitions";
import {
  Vampire20thDataSchema,
  Vampire20thSheetSchema,
} from "./20th-edition/v20.definitions";
import {
  Werewolf20thDataSchema,
  Werewolf20thSheetSchema,
} from "./20th-edition/w20.definitions";
import {
  Mage20thDataSchema,
  Mage20thSheetSchema,
} from "./20th-edition/m20.definitions";
import {
  Changeling20thDataSchema,
  Changeling20thSheetSchema,
} from "./20th-edition/c20.definitions";
import {
  Demon20thDataSchema,
  Demon20thSheetSchema,
} from "./20th-edition/d20.definitions";
import {
  Wraith20thDataSchema,
  Wraith20thSheetSchema,
} from "./20th-edition/wr20.definitions";
import {
  Human20thDataSchema,
  Human20thSheetSchema,
} from "./20th-edition/human20.definitions";
import {
  Ghoul20thDataSchema,
  Ghoul20thSheetSchema,
} from "./20th-edition/ghoul20.definitions";

// ============================================================================
// Character Sheet Data Union (Stored in PostgreSQL characters.data JSONB)
// ============================================================================

/**
 * Polymorphic game sheet payload stored in characters.data JSONB.
 */
export const CharacterSheetDataSchema = z.discriminatedUnion("splat", [
  // 5th Edition
  Vampire5thSheetSchema.extend({ splat: z.literal(Splat.Vampire5th) }),
  Werewolf5thSheetSchema.extend({ splat: z.literal(Splat.Werewolf5th) }),
  Hunter5thSheetSchema.extend({ splat: z.literal(Splat.Hunter5th) }),
  Human5thSheetSchema.extend({ splat: z.literal(Splat.Human5th) }),
  Ghoul5thSheetSchema.extend({ splat: z.literal(Splat.Ghoul5th) }),

  // 20th Anniversary Edition
  Vampire20thSheetSchema.extend({ splat: z.literal(Splat.Vampire20th) }),
  Werewolf20thSheetSchema.extend({ splat: z.literal(Splat.Werewolf20th) }),
  Mage20thSheetSchema.extend({ splat: z.literal(Splat.Mage20th) }),
  Changeling20thSheetSchema.extend({ splat: z.literal(Splat.Changeling20th) }),
  Demon20thSheetSchema.extend({ splat: z.literal(Splat.Demon20th) }),
  Wraith20thSheetSchema.extend({ splat: z.literal(Splat.Wraith20th) }),
  Human20thSheetSchema.extend({ splat: z.literal(Splat.Human20th) }),
  Ghoul20thSheetSchema.extend({ splat: z.literal(Splat.Ghoul20th) }),
]);
export type CharacterSheetData = z.infer<typeof CharacterSheetDataSchema>;

// ============================================================================
// Character Data Union (Complete DTO: Relational Metadata + Sheet Payload)
// ============================================================================

/**
 * Union of all concrete character data types.
 * This is a discriminated union based on the 'splat' field.
 */
export const CharacterDataSchema = z.discriminatedUnion("splat", [
  // 5th Edition
  Vampire5thDataSchema,
  Werewolf5thDataSchema,
  Hunter5thDataSchema,
  Human5thDataSchema,
  Ghoul5thDataSchema,

  // 20th Anniversary Edition
  Vampire20thDataSchema,
  Werewolf20thDataSchema,
  Mage20thDataSchema,
  Changeling20thDataSchema,
  Demon20thDataSchema,
  Wraith20thDataSchema,
  Human20thDataSchema,
  Ghoul20thDataSchema,
]);

export type CharacterData = z.infer<typeof CharacterDataSchema>;

/**
 * Input Data for creating & updating a character.
 */
export type CharacterRepositoryInput = CharacterData;
