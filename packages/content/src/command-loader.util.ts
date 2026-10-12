import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { CommandDocFrontmatterDataSchema, RealmError } from "@realm/common";
import type {
  CommandDocFrontmatterData,
  DiscordCommandManifestData,
} from "@realm/common";

/**
 * Extracts and parses the YAML frontmatter block from a Markdown or MDX string.
 *
 * @param mdxContent - Raw MDX file content
 * @returns The parsed YAML object
 * @throws {RealmError} If the file does not start with a valid YAML frontmatter block
 *
 * @example
 * ```typescript
 * const frontmatter = extractMdxFrontmatter("---\ntitle: Test\n---\n# Body");
 * ```
 */
export function extractMdxFrontmatter(
  mdxContent: string
): Record<string, unknown> {
  // Normalize Windows CRLF line endings so regex matches consistently across OSes
  const normalized = mdxContent.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);

  if (!match || !match[1]) {
    throw new RealmError("MDX file is missing valid YAML frontmatter", {
      fields: { preview: normalized.slice(0, 80) },
    });
  }

  const parsed: unknown = parseYaml(match[1]);
  if (typeof parsed !== "object" || parsed === null) {
    throw new RealmError("MDX frontmatter did not parse to an object");
  }

  return parsed as Record<string, unknown>;
}

/**
 * Resolves the absolute directory path containing Discord command MDX documentation files.
 *
 * @param customDir - Optional override directory path
 * @returns Absolute path to `collections/documentation/discord/commands`
 */
function resolveDiscordCommandsDir(customDir?: string): string {
  if (customDir) {
    return customDir;
  }

  // Locate relative to this module (works in both src/ and dist/)
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidateFromSrc = join(
    currentDir,
    "../collections/documentation/discord/commands"
  );

  if (existsSync(candidateFromSrc)) {
    return candidateFromSrc;
  }

  const candidateFromDist = join(
    currentDir,
    "../../collections/documentation/discord/commands"
  );

  return candidateFromDist;
}

/**
 * Parses and validates a single Discord command MDX document from raw text.
 *
 * @param mdxContent - Raw MDX string content
 * @param sourceName - Identifier or filename for error reporting
 * @returns Validated command documentation frontmatter
 * @throws {RealmError} If the frontmatter violates `CommandDocFrontmatterDataSchema`
 *
 * @example
 * ```typescript
 * const doc = parseCommandMdx(rawMdx, "character.mdx");
 * ```
 */
export function parseCommandMdx(
  mdxContent: string,
  sourceName = "unknown.mdx"
): CommandDocFrontmatterData {
  const rawFrontmatter = extractMdxFrontmatter(mdxContent);
  const result = CommandDocFrontmatterDataSchema.safeParse(rawFrontmatter);

  if (!result.success) {
    throw new RealmError(
      `Invalid Discord command MDX frontmatter in ${sourceName}`,
      {
        fields: {
          file: sourceName,
          errors: result.error.message,
        },
      }
    );
  }

  return result.data;
}

/**
 * Loads and validates a specific Discord command manifest by command name from the
 * `collections/documentation/discord/commands` MDX Single Source of Truth directory.
 *
 * @param commandName - Name of the command (e.g. `"character"`)
 * @param customDir - Optional custom directory override for testing
 * @returns The validated `DiscordCommandManifestData`
 * @throws {RealmError} If the MDX file does not exist or fails schema validation
 *
 * @example
 * ```typescript
 * const manifest = getDiscordCommandManifest("character");
 * ```
 */
export function getDiscordCommandManifest(
  commandName: string,
  customDir?: string
): DiscordCommandManifestData {
  const dir = resolveDiscordCommandsDir(customDir);
  const filePath = join(dir, `${commandName}.mdx`);

  if (!existsSync(filePath)) {
    throw new RealmError(
      `Discord command MDX documentation not found for "/${commandName}"`,
      {
        fields: { commandName, filePath },
      }
    );
  }

  const rawContent = readFileSync(filePath, "utf-8");
  const validated = parseCommandMdx(rawContent, `${commandName}.mdx`);

  return validated.command;
}

/**
 * Loads and validates all Discord command manifests from the MDX documentation directory.
 *
 * @param customDir - Optional custom directory override for testing
 * @returns Array of all validated `DiscordCommandManifestData` objects
 * @throws {RealmError} If any MDX file fails validation
 *
 * @example
 * ```typescript
 * const manifests = loadAllDiscordCommandManifests();
 * ```
 */
export function loadAllDiscordCommandManifests(
  customDir?: string
): DiscordCommandManifestData[] {
  const dir = resolveDiscordCommandsDir(customDir);

  if (!existsSync(dir)) {
    return [];
  }

  const files = readdirSync(dir).filter(
    (file) => file.endsWith(".mdx") || file.endsWith(".md")
  );

  return files.map((file) => {
    const rawContent = readFileSync(join(dir, file), "utf-8");
    const validated = parseCommandMdx(rawContent, file);
    return validated.command;
  });
}
