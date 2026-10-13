import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import {
  CharacterControl,
  CharacterSheetTab,
} from "../../../features/character/character-session.definitions";
import type { Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Props for `SheetTabBarComponent`.
 */
export interface SheetTabBarProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Currently active tab */
  activeTab: CharacterSheetTab;
}

/**
 * Renders the top-level tab navigation buttons on the character sheet.
 *
 * Allows switching between Trackers (Overview), Traits (Attributes & Skills),
 * Bio editing, and Delete confirmation.
 *
 * @param props - Tab state and session identifier
 * @returns `ActionRowBuilder<ButtonBuilder>`
 */
export const SheetTabBarComponent: UIComponent<SheetTabBarProps> = (props) => {
  const isTrackers = props.activeTab === CharacterSheetTab.Trackers;
  const isTraits = props.activeTab === CharacterSheetTab.Traits;
  const isDelete = props.activeTab === CharacterSheetTab.Delete;

  const trackersBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        props.handlerId,
        props.sessionId,
        CharacterControl.TabTrackers
      )
    )
    .setLabel("📊 Trackers")
    .setStyle(isTrackers ? ButtonStyle.Primary : ButtonStyle.Secondary);

  const traitsBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        props.handlerId,
        props.sessionId,
        CharacterControl.TabTraits
      )
    )
    .setLabel("📜 Traits")
    .setStyle(isTraits ? ButtonStyle.Primary : ButtonStyle.Secondary);

  const deleteBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        props.handlerId,
        props.sessionId,
        CharacterControl.TabDelete
      )
    )
    .setLabel("🗑️ Delete")
    .setStyle(isDelete ? ButtonStyle.Danger : ButtonStyle.Secondary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    trackersBtn,
    traitsBtn,
    deleteBtn
  );
};
