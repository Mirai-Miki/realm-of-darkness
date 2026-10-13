import {
  ActionBannerComponent,
  BackButtonComponent,
  DividerComponent,
  GuildDashboardActionsComponent,
  GuildStorytellerSelectorsComponent,
  GuildSummaryComponent,
  TextBlockComponent,
  formatMentionsList,
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
}) => ({
  primary: {
    ephemeral: true,
    body: [
      GuildSummaryComponent({
        guildData,
        storytellerDiscordIds,
        linkedChroniclesCount,
      }),
      ActionBannerComponent({ text: state.lastActionBanner }),
      DividerComponent(),
      GuildDashboardActionsComponent({
        handlerId: GUILD_HANDLER_ID,
        sessionId,
      }),
    ],
  },
});

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
        GuildStorytellerSelectorsComponent({
          handlerId: GUILD_HANDLER_ID,
          sessionId,
        }),
        BackButtonComponent({
          handlerId: GUILD_HANDLER_ID,
          sessionId,
          control: GuildControl.NavBack,
        }),
      ],
    },
  };
};
