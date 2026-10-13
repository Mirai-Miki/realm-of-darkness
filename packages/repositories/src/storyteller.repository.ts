import { and, eq } from "drizzle-orm";
import { db, storytellers, insertStorytellerSchema } from "@realm/database";
import { generateSnowflake, RealmError, SnowflakeSchema } from "@realm/common";
import type {
  IStorytellerRepository,
  Snowflake,
  StorytellerData,
  StorytellerRepositoryInput,
} from "@realm/common";
import type { StorytellerDb } from "@realm/database";

/**
 * Converts a database `StorytellerDb` row into a domain `StorytellerData` DTO.
 *
 * @param row - Database storyteller record
 * @returns Domain storyteller DTO
 */
function toStorytellerData(row: StorytellerDb): StorytellerData {
  return {
    id: row.id,
    userId: row.userId,
    chronicleId: row.chronicleId,
    provider: row.provider,
    createdAt: row.createdAt,
  };
}

/**
 * Repository for managing Storyteller entity persistence in PostgreSQL.
 *
 * Handles granting, revoking, and checking storyteller privileges for users
 * across chronicles and providers.
 */
export class StorytellerRepository implements IStorytellerRepository {
  /**
   * Grant storyteller privileges to a user in a chronicle from a specific provider.
   * If the grant already exists, returns the existing record.
   *
   * @param input - Storyteller grant input data
   * @returns The created or existing storyteller grant data
   * @throws {RealmError} If database insertion fails
   *
   * @example
   * ```typescript
   * const grant = await repo.grant({ userId, chronicleId, provider: "hoisted" });
   * ```
   */
  public async grant(
    input: StorytellerRepositoryInput
  ): Promise<StorytellerData> {
    const validatedUserId = SnowflakeSchema.parse(input.userId);
    const validatedChronicleId = SnowflakeSchema.parse(input.chronicleId);
    const provider = input.provider ?? "hoisted";

    try {
      // Check if already granted
      const existing = await db
        .select()
        .from(storytellers)
        .where(
          and(
            eq(storytellers.userId, validatedUserId),
            eq(storytellers.chronicleId, validatedChronicleId),
            eq(storytellers.provider, provider)
          )
        )
        .limit(1);

      if (existing.length > 0 && existing[0]) {
        return toStorytellerData(existing[0]);
      }

      const id = generateSnowflake();
      const insertData = insertStorytellerSchema.parse({
        id,
        userId: validatedUserId,
        chronicleId: validatedChronicleId,
        provider,
      });

      const [created] = await db
        .insert(storytellers)
        .values(insertData)
        .returning();

      return toStorytellerData(created);
    } catch (error) {
      throw new RealmError("Failed to grant storyteller privilege", {
        cause: error,
        fields: {
          userId: input.userId,
          chronicleId: input.chronicleId,
          provider,
        },
      });
    }
  }

  /**
   * Revoke storyteller privileges from a user in a chronicle for a specific provider.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @param userId - User snowflake ID
   * @param provider - Provider string
   * @throws {RealmError} If database deletion fails
   *
   * @example
   * ```typescript
   * await repo.revoke(chronicleId, userId, "hoisted");
   * ```
   */
  public async revoke(
    chronicleId: Snowflake,
    userId: Snowflake,
    provider: string
  ): Promise<void> {
    const validatedUserId = SnowflakeSchema.parse(userId);
    const validatedChronicleId = SnowflakeSchema.parse(chronicleId);

    try {
      await db
        .delete(storytellers)
        .where(
          and(
            eq(storytellers.userId, validatedUserId),
            eq(storytellers.chronicleId, validatedChronicleId),
            eq(storytellers.provider, provider)
          )
        );
    } catch (error) {
      throw new RealmError("Failed to revoke storyteller privilege", {
        cause: error,
        fields: { userId, chronicleId, provider },
      });
    }
  }

  /**
   * Revoke all storyteller privileges from a user in a chronicle regardless of provider.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @param userId - User snowflake ID
   * @throws {RealmError} If database deletion fails
   *
   * @example
   * ```typescript
   * await repo.revokeAllForUser(chronicleId, userId);
   * ```
   */
  public async revokeAllForUser(
    chronicleId: Snowflake,
    userId: Snowflake
  ): Promise<void> {
    const validatedUserId = SnowflakeSchema.parse(userId);
    const validatedChronicleId = SnowflakeSchema.parse(chronicleId);

    try {
      await db
        .delete(storytellers)
        .where(
          and(
            eq(storytellers.userId, validatedUserId),
            eq(storytellers.chronicleId, validatedChronicleId)
          )
        );
    } catch (error) {
      throw new RealmError(
        "Failed to revoke all storyteller privileges for user",
        {
          cause: error,
          fields: { userId, chronicleId },
        }
      );
    }
  }

  /**
   * Check if a user has any storyteller privileges in a chronicle.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @param userId - User snowflake ID
   * @returns True if the user is a storyteller in the chronicle
   * @throws {RealmError} If database query fails
   *
   * @example
   * ```typescript
   * const isSt = await repo.check(chronicleId, userId);
   * ```
   */
  public async check(
    chronicleId: Snowflake,
    userId: Snowflake
  ): Promise<boolean> {
    const validatedUserId = SnowflakeSchema.parse(userId);
    const validatedChronicleId = SnowflakeSchema.parse(chronicleId);

    try {
      const results = await db
        .select({ id: storytellers.id })
        .from(storytellers)
        .where(
          and(
            eq(storytellers.userId, validatedUserId),
            eq(storytellers.chronicleId, validatedChronicleId)
          )
        )
        .limit(1);

      return results.length > 0;
    } catch (error) {
      throw new RealmError("Failed to check storyteller privilege", {
        cause: error,
        fields: { userId, chronicleId },
      });
    }
  }

  /**
   * Get all provider strings that have granted a user storyteller privileges in a chronicle.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @param userId - User snowflake ID
   * @returns Array of provider strings
   * @throws {RealmError} If database query fails
   *
   * @example
   * ```typescript
   * const providers = await repo.getProviders(chronicleId, userId);
   * ```
   */
  public async getProviders(
    chronicleId: Snowflake,
    userId: Snowflake
  ): Promise<string[]> {
    const validatedUserId = SnowflakeSchema.parse(userId);
    const validatedChronicleId = SnowflakeSchema.parse(chronicleId);

    try {
      const results = await db
        .select({ provider: storytellers.provider })
        .from(storytellers)
        .where(
          and(
            eq(storytellers.userId, validatedUserId),
            eq(storytellers.chronicleId, validatedChronicleId)
          )
        );

      return results.map((r) => r.provider);
    } catch (error) {
      throw new RealmError("Failed to get storyteller providers", {
        cause: error,
        fields: { userId, chronicleId },
      });
    }
  }

  /**
   * Find all storyteller grants for a specific chronicle.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @returns Array of storyteller grant data
   * @throws {RealmError} If database query fails
   *
   * @example
   * ```typescript
   * const storytellers = await repo.findByChronicle(chronicleId);
   * ```
   */
  public async findByChronicle(
    chronicleId: Snowflake
  ): Promise<StorytellerData[]> {
    const validatedChronicleId = SnowflakeSchema.parse(chronicleId);

    try {
      const results = await db
        .select()
        .from(storytellers)
        .where(eq(storytellers.chronicleId, validatedChronicleId));

      return results.map(toStorytellerData);
    } catch (error) {
      throw new RealmError("Failed to find storytellers by chronicle", {
        cause: error,
        fields: { chronicleId },
      });
    }
  }
}
