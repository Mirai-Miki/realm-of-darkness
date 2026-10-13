import type { Snowflake } from "@realm/common";

/**
 * Formats a list of Discord IDs into mentions with safe truncation to prevent
 * exceeding Discord message character limits.
 *
 * @param ids - Array of snowflake IDs
 * @param prefix - Mention prefix ("@" for users, "@&" for roles)
 * @param emptyText - Text to display if empty
 * @param maxDisplay - Maximum mentions to display before truncating (default: 20)
 * @returns Formatted comma-separated mention string
 */
export function formatMentionsList(
  ids: Snowflake[],
  prefix: "@" | "@&",
  emptyText: string,
  maxDisplay = 20
): string {
  if (ids.length === 0) {
    return emptyText;
  }
  const displayed = ids
    .slice(0, maxDisplay)
    .map((id) => `<${prefix}${id}>`)
    .join(", ");
  const remaining = ids.length - maxDisplay;
  return remaining > 0 ? `${displayed} *(and ${remaining} more)*` : displayed;
}
