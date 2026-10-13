import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { encodeSessionCustomId } from "../../framework";
import {
  ActionBannerComponent,
  DividerComponent,
  TextBlockComponent,
} from "../../ui";
import { GuildControl } from "./guild-session.definitions";
import type { DiscordGuildData, Snowflake } from "@realm/common";
import type { ScreenRecipe } from "../../ui";
import type { GuildSessionStateData } from "./guild-session.definitions";

/**
 * Handler ID for `/guild` commands and custom ID routing.
 */
export const GUILD_HANDLER_ID = "guild";

/**
 * Formats a list of Discord IDs into mentions with safe truncation to prevent exceeding 2000 character limits.
 *
 * @param ids - Array of snowflake IDs
 * @param prefix - Mention prefix ("@" for users, "@&" for roles)
 * @param emptyText - Text to display if empty
 * @param maxDisplay - Maximum mentions to display before truncating
 */
function formatMentionsList(
  ids: Snowflake[],
  prefix: "@" | "@&",
  emptyText: string,
  maxDisplay = 20
): string {
  if (ids.length === 0) {
    return emptyText;
  }
  const displayed = ids
    .slice(0, maxDisplay)
    .map((id) => `<${prefix}${id}>`)
    .join(", ");
  const remaining = ids.length - maxDisplay;
  return remaining > 0 ? `${displayed} *(and ${remaining} more)*` : displayed;
}

/**
 * Props for rendering the Guild Dashboard recipe.
 */
export interface GuildDashboardRecipeProps {
  sessionId: Snowflake;
  state: GuildSessionStateData;
  guildData: DiscordGuildData;
  storytellerDiscordIds: Snowflake[];
  linkedChroniclesCount: number;
}

/**
 * Screen Recipe: Server Settings Dashboard.
 */
export const GuildDashboardRecipe: ScreenRecipe<GuildDashboardRecipeProps> = ({
  sessionId,
  state,
  guildData,
  storytellerDiscordIds,
  linkedChroniclesCount,
}) => {
  const manageBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        GUILD_HANDLER_ID,
        sessionId,
        GuildControl.OpenStorytellers
      )
    )
    .setLabel("Manage Server Storytellers")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🎭");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(manageBtn);

  const rolesText = formatMentionsList(
    guildData.storytellerRoleIds,
    "@&",
    "*No server-wide roles assigned*"
  );

  const usersText = formatMentionsList(
    storytellerDiscordIds,
    "@",
    "*No server-wide user storytellers assigned*"
  );

  return {
    primary: {
      ephemeral: true,
      body: [
        TextBlockComponent({
          content:
            `# 🏰 Server Settings — ${guildData.name}\n\n` +
            `**Linked Chronicles:** ${linkedChroniclesCount}\n\n` +
            `**Server-Wide Storyteller Roles:**\n${rolesText}\n\n` +
            `**Server-Wide Storyteller Users:**\n${usersText}\n`,
        }),
        ActionBannerComponent({ text: state.lastActionBanner }),
        DividerComponent(),
        row,
      ],
    },
  };
};

/**
 * Props for managing server storytellers.
 */
export interface ManageGuildStorytellersRecipeProps {
  sessionId: Snowflake;
  guildData: DiscordGuildData;
  storytellerDiscordIds: Snowflake[];
}

/**
 * Screen Recipe: Manage Server-wide Storyteller roles and users.
 */
export const ManageGuildStorytellersRecipe: ScreenRecipe<
  ManageGuildStorytellersRecipeProps
> = ({ sessionId, guildData, storytellerDiscordIds }) => {
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        GUILD_HANDLER_ID,
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
        GUILD_HANDLER_ID,
        sessionId,
        GuildControl.AddServerUserMenu
      )
    )
    .setPlaceholder("Select a user to toggle server-wide Storyteller status...")
    .setMinValues(1)
    .setMaxValues(1);

  const roleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
    roleSelect
  );
  const userRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    userSelect
  );

  const backBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(GUILD_HANDLER_ID, sessionId, GuildControl.NavBack)
    )
    .setLabel("Back")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("⬅️");

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn);

  const rolesText = formatMentionsList(
    guildData.storytellerRoleIds,
    "@&",
    "*No server-wide roles assigned*"
  );

  const usersText = formatMentionsList(
    storytellerDiscordIds,
    "@",
    "*No server-wide user storytellers assigned*"
  );

  return {
    primary: {
      ephemeral: true,
      body: [
        TextBlockComponent({
          content:
            `# 🎭 Manage Server-Wide Storytellers — ${guildData.name}\n\n` +
            `Storytellers assigned here receive Storyteller access across **all** chronicles in this server.\n\n` +
            `**Current Server Storyteller Roles:**\n${rolesText}\n\n` +
            `**Current Server Storyteller Users:**\n${usersText}\n\n` +
            `Use the selectors below to assign or remove server-wide Storytellers:`,
        }),
        DividerComponent(),
        roleRow,
        userRow,
        navRow,
      ],
    },
  };
};
