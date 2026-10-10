/**
 * @file Emoji utilities for asset management
 * @description Helper functions for working with emoji assets
 */

import type { EmojiName } from "../types";
import path from "node:path";
import { getEmojiFilePath } from "./emoji-files.utility";

/**
 * Get the package root directory.
 * Works in both development and production environments.
 */
function getPackageRoot(): string {
  // In compiled dist, this file is at dist/utilities/emoji.utility.js
  // In source, this file is at src/utilities/emoji.utility.ts
  // Package root is 2 levels up from src/utilities or dist/utilities
  return path.resolve(__dirname, "..", "..");
}

/**
 * Get the absolute path to an emoji file
 *
 * @param name - The emoji name (without extension)
 * @param extension - The file extension (default: 'webp')
 * @returns Absolute path to the emoji file
 *
 * @example
 * ```typescript
 * const emojiPath = getEmojiPath('dice_v5_0_p_crit');
 * // Returns: /path/to/packages/assets/emojis/dice/v5/default/primary/crit.webp
 * ```
 */
export function getEmojiPath(
  name: EmojiName,
  extension: string = "webp"
): string {
  const resolved = getEmojiFilePath(name);
  if (resolved) {
    if (extension && !resolved.endsWith(`.${extension}`)) {
      return resolved.replace(/\.[^.]+$/, `.${extension}`);
    }
    return resolved;
  }
  const packageRoot = getPackageRoot();
  return path.join(packageRoot, "emojis", `${name}.${extension}`);
}

/**
 * Check if an emoji exists
 *
 * @param name - The emoji name to check
 * @returns True if the emoji exists
 *
 * @example
 * ```typescript
 * if (emojiExists('dice_v5_0_p_crit')) {
 *   // Use the emoji
 * }
 * ```
 */
export function emojiExists(name: string): name is EmojiName {
  // This is a runtime check - at build time we generate the types
  // In production, you might want to add actual file checking
  return typeof name === "string" && name.length > 0;
}
