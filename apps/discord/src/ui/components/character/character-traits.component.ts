import { TextDisplayBuilder } from "discord.js";
import { Splat } from "@realm/common";
import type { CharacterData } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Formats a dot rating string (e.g. `●●●○○ (3)`).
 *
 * @param rating - Number of filled dots
 * @param max - Maximum number of dots (default: 5)
 * @returns Formatted dots line
 */
export function formatDots(rating: number, max: number = 5): string {
  const safeRating = Math.max(0, Math.min(rating, max));
  const empty = Math.max(0, max - safeRating);
  return `${"●".repeat(safeRating)}${"○".repeat(empty)} (${safeRating})`;
}

/**
 * Props for `CharacterTraitsComponent`.
 */
export interface CharacterTraitsProps {
  /** The full character data DTO */
  character: CharacterData;
}

/**
 * Capitalizes a trait key for display (e.g. `animalKen` -> `Animal Ken`).
 */
function formatTraitName(key: string): string {
  const withSpaces = key.replace(/([A-Z])/g, " $1");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/**
 * Renders a character's Attributes and Skills using visual dot notation.
 *
 * Automatically formats 5th Edition (9 attributes, 27 skills) or 20th Anniversary
 * Edition (9 attributes, 30 abilities across Talents, Skills, Knowledges).
 */
interface TraitEntry {
  rating: number;
  specialties?: readonly string[];
}

const FIFTH_EDITION_SPLATS: readonly Splat[] = [
  Splat.Vampire5th,
  Splat.Werewolf5th,
  Splat.Hunter5th,
  Splat.Human5th,
  Splat.Ghoul5th,
];

/**
 * Renders Attributes and Skills formatted for either 5th Edition or 20th Anniversary Edition.
 *
 * @param props - Character data record
 * @returns `TextDisplayBuilder` containing formatted traits
 */
export const CharacterTraitsComponent: UIComponent<CharacterTraitsProps> = ({
  character,
}) => {
  const is5th = FIFTH_EDITION_SPLATS.includes(character.splat);

  const lines: string[] = [];

  if (is5th && "attributes" in character && "skills" in character) {
    const attrs = character.attributes as unknown as Record<string, number>;
    const skills = character.skills as unknown as Record<string, TraitEntry>;

    lines.push("## Attributes");
    lines.push(
      `**Strength:** ${formatDots(attrs.strength ?? 1)} | **Charisma:** ${formatDots(attrs.charisma ?? 1)} | **Intelligence:** ${formatDots(attrs.intelligence ?? 1)}`
    );
    lines.push(
      `**Dexterity:** ${formatDots(attrs.dexterity ?? 1)} | **Manipulation:** ${formatDots(attrs.manipulation ?? 1)} | **Wits:** ${formatDots(attrs.wits ?? 1)}`
    );
    lines.push(
      `**Stamina:** ${formatDots(attrs.stamina ?? 1)} | **Composure:** ${formatDots(attrs.composure ?? 1)} | **Resolve:** ${formatDots(attrs.resolve ?? 1)}`
    );

    lines.push("\n## Skills");
    const skillEntries = Object.entries(skills);
    // Display non-zero skills first, or grouped summary
    const trained = skillEntries.filter(([, s]) => s.rating > 0);
    if (trained.length > 0) {
      for (const [name, data] of trained) {
        const spec =
          data.specialties && data.specialties.length > 0
            ? ` *(${data.specialties.join(", ")})*`
            : "";
        lines.push(
          `• **${formatTraitName(name)}:** ${formatDots(data.rating)}${spec}`
        );
      }
    } else {
      lines.push("*No skills trained yet (all ratings at 0).*");
    }
  } else if ("attributes" in character && "skills" in character) {
    // 20th Anniversary Edition
    const attrs = character.attributes as unknown as Record<string, TraitEntry>;
    const skills = character.skills as unknown as Record<string, TraitEntry>;

    lines.push("## Attributes");
    lines.push(
      `**Strength:** ${formatDots(attrs.strength?.rating ?? 1)} | **Charisma:** ${formatDots(attrs.charisma?.rating ?? 1)} | **Perception:** ${formatDots(attrs.perception?.rating ?? 1)}`
    );
    lines.push(
      `**Dexterity:** ${formatDots(attrs.dexterity?.rating ?? 1)} | **Manipulation:** ${formatDots(attrs.manipulation?.rating ?? 1)} | **Intelligence:** ${formatDots(attrs.intelligence?.rating ?? 1)}`
    );
    lines.push(
      `**Stamina:** ${formatDots(attrs.stamina?.rating ?? 1)} | **Appearance:** ${formatDots(attrs.appearance?.rating ?? 1)} | **Wits:** ${formatDots(attrs.wits?.rating ?? 1)}`
    );

    lines.push("\n## Abilities");
    const abilityEntries = Object.entries(skills);
    const trained = abilityEntries.filter(([, s]) => s.rating > 0);
    if (trained.length > 0) {
      for (const [name, data] of trained) {
        const spec =
          data.specialties && data.specialties.length > 0
            ? ` *(${data.specialties.join(", ")})*`
            : "";
        lines.push(
          `• **${formatTraitName(name)}:** ${formatDots(data.rating)}${spec}`
        );
      }
    } else {
      lines.push("*No abilities trained yet (all ratings at 0).*");
    }
  }

  return new TextDisplayBuilder().setContent(lines.join("\n"));
};
