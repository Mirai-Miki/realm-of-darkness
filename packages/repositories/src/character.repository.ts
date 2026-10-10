import type { CharacterDb } from "@realm/database";
import type {
  CharacterData,
  ICharacterRepository,
  Snowflake,
} from "@realm/common";

import { eq } from "drizzle-orm";
import { db, characters } from "@realm/database";
import {
  CharacterDataSchema,
  RealmError,
  generateSnowflake,
} from "@realm/common";

/**
 * Converts a database record into a fully validated and typed CharacterData DTO.
 *
 * @param row - The raw CharacterDb record from PostgreSQL
 * @returns Fully parsed and validated CharacterData
 * @throws {RealmError} If the stored JSONB or row structure fails Zod validation
 */
export function toCharacterData(row: CharacterDb): CharacterData {
  const sheetPayload =
    typeof row.data === "object" && row.data !== null
      ? (row.data as Record<string, unknown>)
      : {};

  const merged = {
    id: row.id,
    userId: row.userId,
    chronicleId: row.chronicleId,
    name: row.name,
    splat: row.splat,
    status: row.status,
    avatarUrl: row.avatarUrl,
    themeColor: row.themeColor,
    createdAt: row.createdAt,
    lastUpdated: row.lastUpdated,
    ...sheetPayload,
  };

  const parseResult = CharacterDataSchema.safeParse(merged);
  if (!parseResult.success) {
    throw new RealmError("Database character data failed validation", {
      fields: {
        id: row.id,
        splat: row.splat,
        error: parseResult.error.message,
      },
    });
  }

  return parseResult.data;
}

/**
 * Separates top-level relational columns from the polymorphic game sheet payload.
 *
 * @param input - The character data DTO
 * @param fallbackId - Optional ID to use if input has no id
 * @returns An object containing the relational columns and the JSONB sheet data
 */
export function splitCharacterData(
  input: CharacterData | Omit<CharacterData, "id">,
  fallbackId?: Snowflake
): {
  id: Snowflake;
  userId: Snowflake;
  chronicleId: Snowflake | null;
  name: string;
  splat: CharacterData["splat"];
  status: CharacterData["status"];
  avatarUrl: string | null;
  themeColor: string;
  data: Record<string, unknown>;
  createdAt?: Date;
  lastUpdated: Date;
} {
  const character = input as CharacterData;
  const characterId = character.id ?? fallbackId ?? generateSnowflake();

  // Extract sheet traits excluding relational columns
  const sheetData: Record<string, unknown> = { ...character };
  delete sheetData.id;
  delete sheetData.userId;
  delete sheetData.chronicleId;
  delete sheetData.name;
  delete sheetData.splat;
  delete sheetData.status;
  delete sheetData.avatarUrl;
  delete sheetData.themeColor;
  delete sheetData.createdAt;
  delete sheetData.lastUpdated;

  return {
    id: characterId,
    userId: character.userId,
    chronicleId: character.chronicleId ?? null,
    name: character.name,
    splat: character.splat,
    status: character.status,
    avatarUrl: character.avatarUrl ?? null,
    themeColor: character.themeColor ?? "#000000",
    data: sheetData,
    ...(character.createdAt ? { createdAt: character.createdAt } : {}),
    lastUpdated: new Date(),
  };
}

/**
 * Repository implementation for Character entity persistence using Drizzle ORM.
 *
 * Implements the Hybrid Relational + Validated JSONB document model.
 * Top-level fields are stored in indexed columns, while polymorphic sheet traits
 * are stored in the `data` JSONB column with strict boundary validation via Zod.
 */
export class CharacterRepository implements ICharacterRepository {
  /**
   * Find a character by its Snowflake ID.
   *
   * @param id - Snowflake ID of the character
   * @returns The character data if found, or null
   */
  public async findById(id: Snowflake): Promise<CharacterData | null> {
    const [row] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);

    return row ? toCharacterData(row) : null;
  }

  /**
   * Find all characters belonging to a specific user.
   *
   * @param userId - Snowflake ID of the user
   * @returns Array of character data
   */
  public async findByUser(userId: Snowflake): Promise<CharacterData[]> {
    const rows = await db
      .select()
      .from(characters)
      .where(eq(characters.userId, userId));

    return rows.map(toCharacterData);
  }

  /**
   * Find all characters assigned to a specific chronicle.
   *
   * @param chronicleId - Snowflake ID of the chronicle
   * @returns Array of character data
   */
  public async findByChronicle(
    chronicleId: Snowflake
  ): Promise<CharacterData[]> {
    const rows = await db
      .select()
      .from(characters)
      .where(eq(characters.chronicleId, chronicleId));

    return rows.map(toCharacterData);
  }

  /**
   * Create a new character in the database.
   *
   * @param input - The complete character data or character data without an ID
   * @returns The created character data with generated ID and timestamps
   * @throws {RealmError} If validation fails or insertion errors occur
   */
  public async create(
    input: CharacterData | Omit<CharacterData, "id">
  ): Promise<CharacterData> {
    const assignedId =
      "id" in input && input.id ? input.id : generateSnowflake();

    // Validate the incoming input with the assigned ID
    const validated = CharacterDataSchema.parse({
      ...input,
      id: assignedId,
    });

    const columns = splitCharacterData(validated, assignedId);

    const [inserted] = await db
      .insert(characters)
      .values({
        id: columns.id,
        userId: columns.userId,
        chronicleId: columns.chronicleId,
        name: columns.name,
        splat: columns.splat,
        status: columns.status,
        avatarUrl: columns.avatarUrl,
        themeColor: columns.themeColor,
        data: columns.data,
      })
      .returning();

    if (!inserted) {
      throw new RealmError("Failed to insert character record into database", {
        fields: { id: columns.id, name: columns.name },
      });
    }

    return toCharacterData(inserted);
  }

  /**
   * Update an existing character in the database.
   *
   * @param input - The updated character data
   * @param options - Configuration options (e.g. ignoreNotFound)
   * @returns The updated character data, or null if ignored
   * @throws {RealmError} If character is not found and ignoreNotFound is false
   */
  public async update(input: CharacterData): Promise<CharacterData>;
  public async update(
    input: CharacterData,
    options: { ignoreNotFound: true }
  ): Promise<CharacterData | null>;
  public async update(
    input: CharacterData,
    options?: { ignoreNotFound: boolean }
  ): Promise<CharacterData | null> {
    const validated = CharacterDataSchema.parse(input);
    const columns = splitCharacterData(validated, input.id);

    const [updated] = await db
      .update(characters)
      .set({
        name: columns.name,
        chronicleId: columns.chronicleId,
        splat: columns.splat,
        status: columns.status,
        avatarUrl: columns.avatarUrl,
        themeColor: columns.themeColor,
        data: columns.data,
        lastUpdated: columns.lastUpdated,
      })
      .where(eq(characters.id, input.id))
      .returning();

    if (!updated) {
      if (options?.ignoreNotFound) {
        return null;
      }
      throw new RealmError("Character not found for update", {
        fields: { id: input.id },
      });
    }

    return toCharacterData(updated);
  }

  /**
   * Upsert a character (updates if exists, otherwise creates).
   *
   * @param input - The character data
   * @returns The saved character data
   */
  public async upsert(input: CharacterData): Promise<CharacterData> {
    const exists = await this.exists(input.id);
    if (exists) {
      return this.update(input);
    }
    return this.create(input);
  }

  /**
   * Delete a character by ID.
   *
   * @param id - Snowflake ID of the character to delete
   */
  public async delete(id: Snowflake): Promise<void> {
    await db.delete(characters).where(eq(characters.id, id));
  }

  /**
   * Check if a character exists by ID.
   *
   * @param id - Snowflake ID of the character
   * @returns True if character exists, false otherwise
   */
  public async exists(id: Snowflake): Promise<boolean> {
    const [row] = await db
      .select({ id: characters.id })
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);

    return !!row;
  }
}
