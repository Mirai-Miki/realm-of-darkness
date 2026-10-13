/**
 * Storyteller entity definitions.
 * Defines the Storyteller DTO, Zod schemas, and repository interface.
 *
 * @packageDocumentation
 */
import { z } from "zod";
import { SnowflakeSchema, type Snowflake } from "./primitives";

// ============================================================================
// Storyteller Field Schemas
// ============================================================================

/**
 * Maximum length of the `storytellers.provider` column.
 */
export const StorytellerProviderMaxLength = 255;

/**
 * Storyteller provider string (e.g. "hoisted", discord server id, etc).
 */
export const StorytellerProviderSchema = z
  .string()
  .min(1)
  .max(StorytellerProviderMaxLength);

// ============================================================================
// Storyteller DTOs
// ============================================================================

/**
 * Storyteller entity DTO.
 *
 * Represents a single storyteller privilege grant for a user in a chronicle
 * from a specific provider.
 */
export const StorytellerDataSchema = z.object({
  id: SnowflakeSchema,
  userId: SnowflakeSchema,
  chronicleId: SnowflakeSchema,
  provider: StorytellerProviderSchema,
  createdAt: z.date(),
});
export type StorytellerData = z.infer<typeof StorytellerDataSchema>;

/**
 * Input Data for granting storyteller privileges.
 *
 * Used by the Storyteller repository for persistence operations.
 */
export const StorytellerRepositoryInputSchema = z.object({
  userId: SnowflakeSchema,
  chronicleId: SnowflakeSchema,
  provider: StorytellerProviderSchema.default("hoisted"),
});
export type StorytellerRepositoryInput = z.infer<
  typeof StorytellerRepositoryInputSchema
>;

// ============================================================================
// Storyteller Repository Interface
// ============================================================================

/**
 * Repository interface for Storyteller entity persistence.
 *
 * Defines the contract for managing storyteller privileges.
 */
export interface IStorytellerRepository {
  /**
   * Grant storyteller privileges to a user in a chronicle from a specific provider.
   *
   * @param input - Storyteller grant input data
   * @returns The created storyteller grant data
   */
  grant(input: StorytellerRepositoryInput): Promise<StorytellerData>;

  /**
   * Revoke storyteller privileges from a user in a chronicle for a specific provider.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @param userId - User snowflake ID
   * @param provider - Provider string
   */
  revoke(
    chronicleId: Snowflake,
    userId: Snowflake,
    provider: string
  ): Promise<void>;

  /**
   * Revoke all storyteller privileges from a user in a chronicle regardless of provider.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @param userId - User snowflake ID
   */
  revokeAllForUser(chronicleId: Snowflake, userId: Snowflake): Promise<void>;

  /**
   * Check if a user has any storyteller privileges in a chronicle.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @param userId - User snowflake ID
   * @returns True if the user is a storyteller
   */
  check(chronicleId: Snowflake, userId: Snowflake): Promise<boolean>;

  /**
   * Get all provider strings that have granted a user storyteller privileges in a chronicle.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @param userId - User snowflake ID
   * @returns Array of provider strings
   */
  getProviders(chronicleId: Snowflake, userId: Snowflake): Promise<string[]>;

  /**
   * Find all storyteller grants for a specific chronicle.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @returns Array of storyteller grant data
   */
  findByChronicle(chronicleId: Snowflake): Promise<StorytellerData[]>;
}
