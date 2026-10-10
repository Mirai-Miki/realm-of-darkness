import type { Snowflake } from "../primitives";
import type { CharacterData } from "./character-data.types";

/**
 * Repository interface for Character entity persistence.
 */
export interface ICharacterRepository {
  /**
   * Find a character by ID.
   */
  findById(id: Snowflake): Promise<CharacterData | null>;

  /**
   * Find all characters belonging to a user.
   */
  findByUser(userId: Snowflake): Promise<CharacterData[]>;

  /**
   * Find all characters belonging to a chronicle.
   */
  findByChronicle(chronicleId: Snowflake): Promise<CharacterData[]>;

  /**
   * Create a new character.
   */
  create(
    input: CharacterData | Omit<CharacterData, "id">
  ): Promise<CharacterData>;

  /**
   * Update an existing character.
   */
  update(input: CharacterData): Promise<CharacterData>;
  update(
    input: CharacterData,
    options: { ignoreNotFound: true }
  ): Promise<CharacterData | null>;

  /**
   * Upsert a character.
   */
  upsert(input: CharacterData): Promise<CharacterData>;

  /**
   * Delete a character by ID.
   */
  delete(id: Snowflake): Promise<void>;

  /**
   * Check if a character exists.
   */
  exists(id: Snowflake): Promise<boolean>;
}
