import isEqual from "fast-deep-equal";

/**
 * Compares a DB record with an incoming update DTO.
 *
 * @template T - The full Database Record (e.g., GuildDb, UserDb)
 * @template U - The Update Data (e.g., UpdateGuildData, UpdateUserData)
 * @param current - Current record from database
 * @param incoming - Incoming update data
 * @param ignoreKeys - Keys to skip in comparison (defaults to id and timestamps)
 * @returns True if data has changed, false otherwise
 *
 * @example
 * ```typescript
 * const changed = hasDataChanged<GuildDb, UpdateGuildData>(
 *   currentGuild,
 *   updateData
 * );
 * ```
 */
export function hasDataChanged<
  T extends Record<string, any>,
  U extends Partial<T>,
>(
  current: T,
  incoming: U,
  ignoreKeys: (keyof T)[] = ["id", "createdAt", "lastUpdated", "updatedAt"]
): boolean {
  const incomingKeys = Object.keys(incoming) as (keyof U)[];
  const keysToCompare = incomingKeys.filter(
    (key) => !ignoreKeys.includes(key as unknown as keyof T)
  );

  for (const key of keysToCompare) {
    const incomingValue = incoming[key];
    if (incomingValue === undefined) continue;

    // Since U extends Partial<T>, we know 'key' exists on T
    const currentValue = current[key as unknown as keyof T];

    // Handles Snowflakes, JSONB (nested character stats), and Dates
    if (!isEqual(currentValue, incomingValue)) {
      return true;
    }
  }

  return false;
}
