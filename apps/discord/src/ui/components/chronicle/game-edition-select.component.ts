import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { GameEdition } from "@realm/common";
import { encodeSessionCustomId } from "../../../framework";
import { ChronicleControl } from "../../../features/chronicle/chronicle-session.definitions";
import type { Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Props for `GameEditionSelectComponent`.
 */
export interface GameEditionSelectProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Currently active game edition */
  currentVersion: GameEdition;
}

/**
 * Renders the select dropdown menu for changing a chronicle's default game edition.
 *
 * @param props - Game edition select configuration
 * @returns `ActionRowBuilder<StringSelectMenuBuilder>`
 */
export const GameEditionSelectComponent: UIComponent<
  GameEditionSelectProps
> = ({ handlerId, sessionId, currentVersion }) => {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        ChronicleControl.SelectVersionMenu
      )
    )
    .setPlaceholder("Choose default game edition...")
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel("5th Edition (V5 / W5 / H5)")
        .setDescription("Uses Hunger, Despair, and 5th Edition mechanics")
        .setValue(GameEdition.Fifth)
        .setDefault(currentVersion === GameEdition.Fifth),
      new StringSelectMenuOptionBuilder()
        .setLabel("20th Anniversary (V20 / W20 / M20)")
        .setDescription("Classic d10 dice pools with variable difficulties")
        .setValue(GameEdition.Twentieth)
        .setDefault(currentVersion === GameEdition.Twentieth),
      new StringSelectMenuOptionBuilder()
        .setLabel("Chronicles of Darkness (CofD / VtR)")
        .setDescription("10-again rules, Conditions, and CofD mechanics")
        .setValue(GameEdition.Cod)
        .setDefault(currentVersion === GameEdition.Cod),
    ]);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );
};
