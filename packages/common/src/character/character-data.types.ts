import { z } from "zod";

import { Splat } from "./character.definitions";
import {
  Vampire5thDataSchema,
  Vampire5thSheetSchema,
} from "./5th-edition/v5.definitions";
import {
  Vampire20thDataSchema,
  Vampire20thSheetSchema,
} from "./20th-edition/v20.definitions";

// ============================================================================
// Character Sheet Data Union (Stored in PostgreSQL characters.data JSONB)
// ============================================================================

/**
 * Polymorphic game sheet payload stored in characters.data JSONB.
 */
export const CharacterSheetDataSchema = z.discriminatedUnion("splat", [
  Vampire5thSheetSchema.extend({ splat: z.literal(Splat.Vampire5th) }),
  Vampire20thSheetSchema.extend({ splat: z.literal(Splat.Vampire20th) }),
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
  Vampire5thDataSchema,
  Vampire20thDataSchema,
]);

export type CharacterData = z.infer<typeof CharacterDataSchema>;

/**
 * Input Data for creating & updating a character.
 */
export type CharacterRepositoryInput = CharacterData;
