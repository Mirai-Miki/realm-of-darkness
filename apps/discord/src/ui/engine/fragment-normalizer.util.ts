import { SeparatorBuilder } from "discord.js";
import { RealmError } from "@realm/common";
import type { UIFragment, UINode } from "./render-engine.types";

/**
 * Maximum number of top-level Components V2 nodes allowed in a single Discord message.
 */
export const MAX_COMPONENTS_PER_MESSAGE = 40;

/**
 * Recursively flattens a `UIFragment` tree into a flat array of `UINode`s,
 * discarding `null`, `undefined`, and `false` conditional branches.
 */
function flattenFragment(fragment: UIFragment, output: UINode[]): void {
  if (!fragment) {
    return;
  }

  if (Array.isArray(fragment)) {
    for (const child of fragment) {
      flattenFragment(child as UIFragment, output);
    }
    return;
  }

  output.push(fragment as UINode);
}

/**
 * Normalizes a `UIFragment` tree into a clean, valid array of Discord Components V2 nodes:
 * 1. Recursively flattens nested arrays.
 * 2. Strips `null`, `undefined`, and `false` conditional values.
 * 3. Collapses adjacent `SeparatorBuilder` instances and trims leading/trailing separators
 *    so conditionally hidden sections never leave awkward double dividers.
 * 4. Validates that the resulting component array is non-empty and within Discord's 40-component limit.
 *
 * @param fragment - The raw `UIFragment` tree to normalize
 * @returns Sanitized array of `UINode` builders
 * @throws {RealmError} If the normalized fragment is empty or exceeds 40 components
 *
 * @example
 * ```typescript
 * const nodes = normalizeFragment([
 *   false && BannerComponent(),
 *   DividerComponent(),
 *   HeaderComponent(),
 * ]);
 * ```
 */
export function normalizeFragment(fragment: UIFragment): UINode[] {
  const flat: UINode[] = [];
  flattenFragment(fragment, flat);

  const sanitized: UINode[] = [];

  for (const node of flat) {
    const isSeparator = node instanceof SeparatorBuilder;

    // Skip leading separators or consecutive duplicate separators
    if (isSeparator) {
      if (
        sanitized.length === 0 ||
        sanitized[sanitized.length - 1] instanceof SeparatorBuilder
      ) {
        continue;
      }
    }

    sanitized.push(node);
  }

  // Trim trailing separator if present
  while (
    sanitized.length > 0 &&
    sanitized[sanitized.length - 1] instanceof SeparatorBuilder
  ) {
    sanitized.pop();
  }

  if (sanitized.length === 0) {
    throw new RealmError(
      "Normalized UIFragment produced zero renderable Discord components"
    );
  }

  if (sanitized.length > MAX_COMPONENTS_PER_MESSAGE) {
    throw new RealmError(
      `Normalized UIFragment exceeds Discord's ${MAX_COMPONENTS_PER_MESSAGE}-component limit`,
      {
        fields: { count: String(sanitized.length) },
      }
    );
  }

  return sanitized;
}
