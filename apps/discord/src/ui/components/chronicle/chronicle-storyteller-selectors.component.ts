import {
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import { ChronicleControl } from "../../../features/chronicle/chronicle-session.definitions";
import type { Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Props for `ChronicleStorytellerSelectorsComponent`.
 */
export interface ChronicleStorytellerSelectorsProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
}

/**
 * Renders role and user multi-select menus for assigning chronicle-specific Storytellers.
 *
 * @param props - Storyteller selectors configuration
 * @returns Array of 2 `ActionRowBuilder` nodes
 */
export const ChronicleStorytellerSelectorsComponent: UIComponent<
  ChronicleStorytellerSelectorsProps
> = ({ handlerId, sessionId }) => {
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        ChronicleControl.AddStorytellerRoleMenu
      )
    )
    .setPlaceholder("Select a role to toggle Storyteller status...")
    .setMinValues(1)
    .setMaxValues(1);

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        ChronicleControl.AddStorytellerUserMenu
      )
    )
    .setPlaceholder("Select a user to toggle Storyteller status...")
    .setMinValues(1)
    .setMaxValues(1);

  return [
    new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect),
    new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect),
  ];
};
