import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { Splat } from "@realm/common";
import { encodeSessionCustomId } from "../../../framework";
import { CharacterControl } from "../../../features/character/character-session.definitions";
import type { Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Formats a `Splat` enum key into a human-readable game line title.
 *
 * @param key - Splat enum identifier string
 * @returns Formatted title (e.g. "Vampire (5th Edition)")
 */
export function formatSplatLabel(key: string): string {
  const match = key.match(/^([A-Za-z]+)(20th|5th|CoD)?$/);
  if (!match) return key;

  const [, gameLine, edition] = match;
  const gameLineName = (gameLine ?? key).replace(/([A-Z])/g, " $1").trim();

  if (edition === "20th") {
    return `${gameLineName} (20th Anniversary)`;
  }
  if (edition === "5th") {
    return `${gameLineName} (5th Edition)`;
  }
  if (edition === "CoD") {
    return `${gameLineName} (Chronicles of Darkness)`;
  }

  return gameLineName;
}

/**
 * Props for `SplatSelectComponent`.
 */
export interface SplatSelectProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
}

/**
 * Renders the splat / game line dropdown selection menu for character creation.
 *
 * @param props - Splat select configuration
 * @returns `ActionRowBuilder<StringSelectMenuBuilder>`
 */
export const SplatSelectComponent: UIComponent<SplatSelectProps> = ({
  handlerId,
  sessionId,
}) => {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        CharacterControl.SelectSplatMenu
      )
    )
    .setPlaceholder("Choose a character type / game line...")
    .addOptions(
      Object.entries(Splat).map(([key, value]) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(formatSplatLabel(key))
          .setValue(value)
      )
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );
};
