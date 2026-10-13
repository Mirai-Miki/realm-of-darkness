import {
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import { GuildControl } from "../../../features/guild/guild-session.definitions";
import type { Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Props for `GuildStorytellerSelectorsComponent`.
 */
export interface GuildStorytellerSelectorsProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
}

/**
 * Renders role and user multi-select menus for assigning server-wide Storytellers.
 *
 * @param props - Storyteller selectors configuration
 * @returns Array of 2 `ActionRowBuilder` nodes
 */
export const GuildStorytellerSelectorsComponent: UIComponent<
  GuildStorytellerSelectorsProps
> = ({ handlerId, sessionId }) => {
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        GuildControl.AddServerRoleMenu
      )
    )
    .setPlaceholder("Select a role to toggle server-wide Storyteller status...")
    .setMinValues(1)
    .setMaxValues(1);

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        GuildControl.AddServerUserMenu
      )
    )
    .setPlaceholder("Select a user to toggle server-wide Storyteller status...")
    .setMinValues(1)
    .setMaxValues(1);

  return [
    new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect),
    new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect),
  ];
};
