import { SnowflakeSchema, RealmError } from "@realm/common";
import type { Snowflake } from "@realm/common";

/**
 * Parsed result from a standardized stateless session `customId`.
 */
export interface ParsedSessionCustomId {
  /** The target coordinator or interface handler ID */
  handlerId: string;
  /** The PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Optional control identifier when a single view contains multiple buttons/menus */
  control?: string;
}

/**
 * Encodes a handler ID, session Snowflake, and optional control name into a
 * standardized Discord `customId` string.
 *
 * All domain state lives inside the PostgreSQL `interaction_sessions` table;
 * the `customId` only carries the session pointer and optional control identifier.
 *
 * @param handlerId - Target coordinator/handler ID (e.g., `"character"`)
 * @param sessionId - Snowflake ID of the PostgreSQL interaction session
 * @param control - Optional control action key (e.g., `"inc_hunger"`, `"confirm_create"`)
 * @returns Formatted `customId` string guaranteed to be <= 100 characters
 * @throws {RealmError} If the resulting `customId` exceeds Discord's 100-character limit
 *
 * @example
 * ```typescript
 * const customId = encodeSessionCustomId("character", session.id, "inc_hunger");
 * // "character:123456789012345678:inc_hunger"
 * ```
 */
export function encodeSessionCustomId(
  handlerId: string,
  sessionId: Snowflake,
  control?: string
): string {
  const customId = control
    ? `${handlerId}:${sessionId}:${control}`
    : `${handlerId}:${sessionId}`;

  if (customId.length > 100) {
    throw new RealmError(
      "Encoded Discord customId exceeds 100 character limit",
      {
        fields: {
          handlerId,
          sessionId,
          control: control ?? "",
          length: String(customId.length),
        },
      }
    );
  }

  return customId;
}

/**
 * Decodes a standardized Discord `customId` string into its `handlerId`,
 * validated `sessionId` Snowflake, and optional `control` key.
 *
 * @param customId - The raw `customId` string from a Discord component or modal interaction
 * @returns The parsed `handlerId`, `sessionId`, and optional `control`
 * @throws {RealmError} If the `customId` does not contain a valid `handlerId` and Snowflake `sessionId`
 *
 * @example
 * ```typescript
 * const { handlerId, sessionId, control } = decodeSessionCustomId(interaction.customId);
 * ```
 */
export function decodeSessionCustomId(customId: string): ParsedSessionCustomId {
  const parts = customId.split(":");

  if (parts.length < 2 || parts.length > 3) {
    throw new RealmError("Invalid session customId format", {
      fields: { customId },
    });
  }

  const [handlerId, rawSessionId, control] = parts;

  if (!handlerId) {
    throw new RealmError("Missing handlerId in session customId", {
      fields: { customId },
    });
  }

  const sessionParse = SnowflakeSchema.safeParse(rawSessionId);
  if (!sessionParse.success) {
    throw new RealmError("Invalid sessionId Snowflake in customId", {
      fields: {
        customId,
        rawSessionId: rawSessionId ?? "",
      },
    });
  }

  return {
    handlerId,
    sessionId: sessionParse.data,
    ...(control ? { control } : {}),
  };
}
