import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import { ChronicleControl } from "../../../features/chronicle/chronicle-session.definitions";
import type { Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Props for `ChronicleDashboardActionsComponent`.
 */
export interface ChronicleDashboardActionsProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Total chronicles linked to the guild */
  linkedChroniclesCount: number;
}

/**
 * Renders the dashboard action button rows (`Switch`, `Version`, `Storytellers`, `New`, `Delete`).
 *
 * @param props - Chronicle action buttons configuration
 * @returns Array of 2 `ActionRowBuilder<ButtonBuilder>` nodes
 */
export const ChronicleDashboardActionsComponent: UIComponent<
  ChronicleDashboardActionsProps
> = ({ handlerId, sessionId, linkedChroniclesCount }) => {
  const switchBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        ChronicleControl.OpenSwitchChronicle
      )
    )
    .setLabel(`Switch Chronicle (${linkedChroniclesCount})`)
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("🔄");

  const versionBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        ChronicleControl.OpenVersionMenu
      )
    )
    .setLabel("Change Default Version")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("⚙️");

  const stBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        ChronicleControl.OpenStorytellers
      )
    )
    .setLabel("Manage Storytellers")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("🎭");

  const createBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        ChronicleControl.OpenCreateModal
      )
    )
    .setLabel("New Chronicle")
    .setStyle(ButtonStyle.Success)
    .setEmoji("➕");

  const deleteBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        ChronicleControl.OpenDeleteConfirm
      )
    )
    .setLabel("Delete Chronicle")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("🗑️");

  const topRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    switchBtn,
    versionBtn,
    stBtn
  );

  const bottomRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    createBtn,
    deleteBtn
  );

  return [topRow, bottomRow];
};
