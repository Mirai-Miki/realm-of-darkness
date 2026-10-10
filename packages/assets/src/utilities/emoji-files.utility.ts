/**
 * Emoji File Utilities
 *
 * Provides utilities for accessing emoji file paths without needing to know
 * the underlying folder structure. Used by Discord emoji uploaders and managers.
 *
 * @module utilities
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { EmojiName } from "../types/emoji.types.js";

// Get directory name in ES module context
const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = path.dirname(currentFilename);

/**
 * Supported image formats for emoji assets
 */
const SUPPORTED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
] as const;

/**
 * Emoji file metadata
 */
export interface EmojiFile {
  /** Emoji name (e.g., "dice_v5_default_primary_crit") */
  name: EmojiName;
  /** Absolute path to the emoji file */
  absolutePath: string;
  /** Relative path from emojis root */
  relativePath: string;
  /** File extension */
  extension: string;
}

/**
 * Check if a file is a supported image format
 */
function isSupportedImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(
    ext as (typeof SUPPORTED_EXTENSIONS)[number]
  );
}

/**
 * Get the root emojis directory path
 *
 * This function finds the package root by looking for package.json,
 * which works reliably whether code is run from src/ or dist/.
 */
function getEmojisDir(): string {
  // Start from current file location
  let currentDir = currentDirname;

  // Walk up the directory tree until we find package.json
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      // Found the package root
      return path.join(currentDir, "emojis");
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback: assume we're in the package and emojis is a sibling
  throw new Error(
    "Could not find package root (no package.json found in parent directories)"
  );
}

/**
 * Recursively scan directory for emoji files
 */
function scanEmojisRecursive(
  dir: string,
  rootDir: string,
  pathPrefix: string[] = []
): EmojiFile[] {
  const results: EmojiFile[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively scan subdirectory
      const subResults = scanEmojisRecursive(fullPath, rootDir, [
        ...pathPrefix,
        entry.name,
      ]);
      results.push(...subResults);
    } else if (entry.isFile() && isSupportedImageFile(entry.name)) {
      // Add emoji file
      const baseName = path.parse(entry.name).name;
      const segments = [...pathPrefix, baseName];
      const fullName = segments.join("_");
      // Use MD5 hash as the emoji name (matches Discord emoji names)
      const name = createHash("md5")
        .update(fullName)
        .digest("hex") as EmojiName;
      const relativePath = path.relative(rootDir, fullPath);
      const extension = path.extname(entry.name);

      results.push({
        name,
        absolutePath: fullPath,
        relativePath,
        extension,
      });
    }
  }

  return results;
}

/**
 * Cache for emoji files (populated on first access)
 */
let emojiFilesCache: EmojiFile[] | null = null;

/**
 * Get all emoji files with their metadata.
 * Results are cached after first call for performance.
 *
 * @returns Array of emoji file metadata
 *
 * @example
 * ```typescript
 * import { getAllEmojiFiles } from '@realm/assets';
 *
 * const emojis = getAllEmojiFiles();
 * console.log(`Found ${emojis.length} emojis`);
 *
 * for (const emoji of emojis) {
 *   console.log(`${emoji.name}: ${emoji.absolutePath}`);
 * }
 * ```
 */
export function getAllEmojiFiles(): EmojiFile[] {
  if (emojiFilesCache === null) {
    const emojisDir = getEmojisDir();
    emojiFilesCache = scanEmojisRecursive(emojisDir, emojisDir).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  return emojiFilesCache;
}

/**
 * Get the absolute file path for a specific emoji.
 *
 * @param name - The emoji name
 * @returns Absolute path to the emoji file, or null if not found
 *
 * @example
 * ```typescript
 * import { getEmojiFilePath } from '@realm/assets';
 *
 * const path = getEmojiFilePath('dice_v5_default_primary_crit');
 * if (path) {
 *   console.log(`Found emoji at: ${path}`);
 * }
 * ```
 */
export function getEmojiFilePath(name: EmojiName): string | null {
  const files = getAllEmojiFiles();
  const file = files.find((f) => f.name === name);
  return file ? file.absolutePath : null;
}

/**
 * Check if an emoji exists.
 *
 * @param name - The emoji name
 * @returns True if the emoji exists
 *
 * @example
 * ```typescript
 * import { emojiExists } from '@realm/assets';
 *
 * if (emojiExists('dice_v5_default_primary_crit')) {
 *   console.log('Emoji exists!');
 * }
 * ```
 */
export function emojiExists(name: EmojiName): boolean {
  return getEmojiFilePath(name) !== null;
}

/**
 * Clear the emoji files cache.
 * Useful for testing or if files change at runtime.
 *
 * @example
 * ```typescript
 * import { clearEmojiCache } from '@realm/assets';
 *
 * clearEmojiCache();
 * // Next call to getAllEmojiFiles() will re-scan the directory
 * ```
 */
export function clearEmojiCache(): void {
  emojiFilesCache = null;
}
