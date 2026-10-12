import {
  RealmError,
  ChronicleNameSchema,
  ChronicleIconUrlSchema,
} from "@realm/common";
import type {
  ChronicleData,
  ChronicleRepositoryInput,
  Snowflake,
} from "@realm/common";

/**
 * Domain entity representing a Chronicle (core game session).
 *
 * A Chronicle is the platform-agnostic backend game session container that
 * holds characters, members, storytellers, and trackers. It is decoupled from
 * frontend adapters such as `DiscordGuild` via the `discord_guild_chronicles` join table.
 *
 * This entity wraps `ChronicleData` with business logic and validation.
 */
export class Chronicle {
  /** Internal mutable state holding the validated chronicle data. */
  private _data: ChronicleData;

  /**
   * Creates an instance of Chronicle.
   *
   * @param data - The raw Chronicle data
   *
   * @example
   * ```typescript
   * const chronicle = new Chronicle(chronicleData);
   * ```
   */
  constructor(data: ChronicleData) {
    this._data = { ...data };
  }

  /**
   * Get the Chronicle's internal RoD Snowflake ID.
   *
   * @returns The Chronicle Snowflake ID
   *
   * @example
   * ```typescript
   * const id = chronicle.id;
   * ```
   */
  public get id(): Snowflake {
    return this._data.id;
  }

  /**
   * Get the Chronicle's display name.
   *
   * @returns The Chronicle name
   *
   * @example
   * ```typescript
   * const name = chronicle.name;
   * ```
   */
  public get name(): string {
    return this._data.name;
  }

  /**
   * Get the Chronicle's icon URL.
   *
   * @returns The Chronicle icon URL
   *
   * @example
   * ```typescript
   * const iconUrl = chronicle.iconUrl;
   * ```
   */
  public get iconUrl(): string {
    return this._data.iconUrl;
  }

  /**
   * Get the timestamp when the Chronicle was created.
   *
   * @returns Creation Date
   *
   * @example
   * ```typescript
   * const createdAt = chronicle.createdAt;
   * ```
   */
  public get createdAt(): Date {
    return this._data.createdAt;
  }

  /**
   * Get the timestamp when the Chronicle was last updated.
   *
   * @returns Last updated Date
   *
   * @example
   * ```typescript
   * const lastUpdated = chronicle.lastUpdated;
   * ```
   */
  public get lastUpdated(): Date {
    return this._data.lastUpdated;
  }

  /**
   * Update the Chronicle's display name.
   *
   * @param name - New Chronicle name
   * @throws {RealmError} If name is invalid according to ChronicleNameSchema
   *
   * @example
   * ```typescript
   * chronicle.updateName("Chicago by Night");
   * ```
   */
  public updateName(name: string): void {
    const result = ChronicleNameSchema.safeParse(name);
    if (!result.success) {
      throw new RealmError("Invalid chronicle name", {
        cause: result.error,
      });
    }
    this._data.name = result.data;
  }

  /**
   * Update the Chronicle's icon URL.
   *
   * @param iconUrl - New icon URL
   * @throws {RealmError} If icon URL is invalid according to ChronicleIconUrlSchema
   *
   * @example
   * ```typescript
   * chronicle.updateIconUrl("https://cdn.discordapp.com/icons/123456789012345678/abcdef.png");
   * ```
   */
  public updateIconUrl(iconUrl: string): void {
    const result = ChronicleIconUrlSchema.safeParse(iconUrl);
    if (!result.success) {
      throw new RealmError("Invalid chronicle icon URL", {
        cause: result.error,
      });
    }
    this._data.iconUrl = result.data;
  }

  /**
   * Extract a defensive copy of the Chronicle data from this entity.
   *
   * @returns ChronicleData for persistence or serialization
   *
   * @example
   * ```typescript
   * const data = chronicle.toData();
   * ```
   */
  public toData(): ChronicleData {
    return { ...this._data };
  }

  /**
   * Extract repository input data from this entity.
   * Excludes `createdAt` and `lastUpdated` (managed by repository).
   *
   * @returns Chronicle repository input data
   *
   * @example
   * ```typescript
   * const input = chronicle.toRepositoryInput();
   * ```
   */
  public toRepositoryInput(): ChronicleRepositoryInput {
    return {
      id: this._data.id,
      name: this._data.name,
      iconUrl: this._data.iconUrl,
    };
  }
}
