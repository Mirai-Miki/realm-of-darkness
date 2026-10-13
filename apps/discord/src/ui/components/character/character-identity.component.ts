import { TextDisplayBuilder } from "discord.js";
import { Splat } from "@realm/common";
import { ActionBannerComponent } from "../common";
import type { Splat as SplatType } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Returns the appropriate emoji and formatted label for a given splat.
 */
function getSplatDisplay(splat?: SplatType): { emoji: string; label: string } {
  switch (splat) {
    case Splat.Vampire5th:
      return { emoji: "🩸", label: "Vampire: The Masquerade (5th Edition)" };
    case Splat.Werewolf5th:
      return { emoji: "🐺", label: "Werewolf: The Apocalypse (5th Edition)" };
    case Splat.Hunter5th:
      return { emoji: "🏹", label: "Hunter: The Reckoning (5th Edition)" };
    case Splat.Human5th:
      return { emoji: "👤", label: "Mortal (5th Edition)" };
    case Splat.Ghoul5th:
      return { emoji: "🧪", label: "Ghoul (5th Edition)" };

    case Splat.Vampire20th:
      return {
        emoji: "🦇",
        label: "Vampire: The Masquerade (20th Anniversary)",
      };
    case Splat.Werewolf20th:
      return {
        emoji: "🌕",
        label: "Werewolf: The Apocalypse (20th Anniversary)",
      };
    case Splat.Mage20th:
      return { emoji: "🔮", label: "Mage: The Ascension (20th Anniversary)" };
    case Splat.Changeling20th:
      return {
        emoji: "🧚",
        label: "Changeling: The Dreaming (20th Anniversary)",
      };
    case Splat.Demon20th:
      return { emoji: "👿", label: "Demon: The Fallen (20th Anniversary)" };
    case Splat.Wraith20th:
      return { emoji: "👻", label: "Wraith: The Oblivion (20th Anniversary)" };
    case Splat.Human20th:
      return { emoji: "👤", label: "Mortal (20th Anniversary)" };
    case Splat.Ghoul20th:
      return { emoji: "🧪", label: "Ghoul (20th Anniversary)" };

    default:
      return { emoji: "📜", label: "World of Darkness" };
  }
}

/**
 * Props for `CharacterIdentityComponent`.
 */
export interface CharacterIdentityProps {
  /** Character's display name */
  characterName: string;
  /** Character's game line / splat */
  splat?: SplatType;
  /** Character's short concept */
  concept: string;
  /** Character's current ambition */
  ambition: string;
  /** Optional status or roll banner to display above the identity details */
  bannerText?: string;
}

/**
 * Renders a character's identity header block (Title, optional action banner,
 * System/Status line, Concept, and Ambition).
 *
 * Reusable across the `/character` Editor Home, sub-screens, and roll cards.
 *
 * @param props - Character identity properties
 * @returns `UIFragment` containing the identity header and optional banner
 *
 * @example
 * ```typescript
 * CharacterIdentityComponent({
 *   characterName: "Helena Vance",
 *   splat: Splat.Vampire5th,
 *   concept: "Shadow Broker",
 *   ambition: "Reclaim Vienna library",
 * })
 * ```
 */
export const CharacterIdentityComponent: UIComponent<CharacterIdentityProps> = (
  props
) => {
  const { emoji, label } = getSplatDisplay(props.splat);

  const titleBlock = new TextDisplayBuilder().setContent(
    `# ${emoji} ${props.characterName}\n` +
      `**System:** ${label} • **Status:** Active\n` +
      `**Concept:** ${props.concept}\n` +
      `**Ambition:** *${props.ambition}*`
  );

  return [ActionBannerComponent({ text: props.bannerText }), titleBlock];
};
