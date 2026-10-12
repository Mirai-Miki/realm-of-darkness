import { TextDisplayBuilder } from "discord.js";
import { Splat } from "@realm/common";
import { ActionBannerComponent } from "../common";
import type { Splat as SplatType } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Props for `CharacterIdentityComponent`.
 */
export interface CharacterIdentityProps {
  /** Character's display name */
  characterName: string;
  /** Character's game line / splat */
  splat?: SplatType;
  /** Character's clan, tribe, or lineage */
  clan?: string;
  /** Character's generation or potency tier */
  generation: number;
  /** Character's short concept */
  concept: string;
  /** Character's current ambition */
  ambition: string;
  /** Optional status or roll banner to display above the identity details */
  bannerText?: string;
}

/**
 * Renders a character's identity header block (Title, optional action banner,
 * System/Clan/Generation line, Concept, and Ambition).
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
 *   clan: "Lasombra",
 *   generation: 11,
 *   concept: "Shadow Broker",
 *   ambition: "Reclaim Vienna library",
 * })
 * ```
 */
export const CharacterIdentityComponent: UIComponent<CharacterIdentityProps> = (
  props
) => {
  const titleBlock = new TextDisplayBuilder().setContent(
    `# 🧛 ${props.characterName}\n` +
      `**System:** \`${props.splat ?? Splat.Vampire5th}\` • **Clan:** ${props.clan ?? "Caitiff"} • **Gen:** ${props.generation}th\n` +
      `**Concept:** ${props.concept}\n` +
      `**Ambition:** *${props.ambition}*`
  );

  return [ActionBannerComponent({ text: props.bannerText }), titleBlock];
};
