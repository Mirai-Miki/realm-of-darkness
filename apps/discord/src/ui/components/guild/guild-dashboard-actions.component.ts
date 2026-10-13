import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import { GuildControl } from "../../../features/guild/guild-session.definitions";
import type { Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Props for `GuildDashboardActionsComponent`.
 */
export interface GuildDashboardActionsProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
}

/**
 * Renders the dashboard action button row for server settings.
 *
 * @param props - Guild dashboard actions configuration
 * @returns `ActionRowBuilder<ButtonBuilder>`
 */
export const GuildDashboardActionsComponent: UIComponent<
  GuildDashboardActionsProps
> = ({ handlerId, sessionId }) => {
  const manageBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(handlerId, sessionId, GuildControl.OpenStorytellers)
    )
    .setLabel("Manage Server Storytellers")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🎭");

  return new ActionRowBuilder<ButtonBuilder>().addComponents(manageBtn);
};
