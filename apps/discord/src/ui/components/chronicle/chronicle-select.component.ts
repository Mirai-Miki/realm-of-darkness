import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import { ChronicleControl } from "../../../features/chronicle/chronicle-session.definitions";
import type { ChronicleData, Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Maximum items Discord allows in a single select menu.
 */
const MAX_SELECT_OPTIONS = 25;

/**
 * Props for `ChronicleSelectComponent`.
 */
export interface ChronicleSelectProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Array of available chronicles */
  chronicles: ChronicleData[];
  /** Currently active chronicle ID */
  activeChronicleId: Snowflake;
}

/**
 * Renders the select dropdown menu to switch the server's active chronicle.
 *
 * @param props - Chronicle select configuration
 * @returns `ActionRowBuilder<StringSelectMenuBuilder>`
 */
export const ChronicleSelectComponent: UIComponent<ChronicleSelectProps> = ({
  handlerId,
  sessionId,
  chronicles,
  activeChronicleId,
}) => {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        ChronicleControl.SwitchChronicleMenu
      )
    )
    .setPlaceholder("Choose a chronicle to switch to...")
    .addOptions(
      chronicles.slice(0, MAX_SELECT_OPTIONS).map((c) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(c.name.slice(0, 100))
          .setDescription(`Edition: ${c.defaultVersion}`.slice(0, 100))
          .setValue(c.id)
          .setDefault(c.id === activeChronicleId)
      )
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );
};
