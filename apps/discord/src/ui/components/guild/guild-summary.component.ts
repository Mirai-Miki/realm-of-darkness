import { formatMentionsList, TextBlockComponent } from "../common";
import type { DiscordGuildData, Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Props for `GuildSummaryComponent`.
 */
export interface GuildSummaryProps {
  /** Guild database entity */
  guildData: DiscordGuildData;
  /** Discord IDs of users possessing storyteller permissions */
  storytellerDiscordIds: Snowflake[];
  /** Total chronicles linked to this guild */
  linkedChroniclesCount: number;
}

/**
 * Renders the markdown summary text block for server-wide settings.
 *
 * @param props - Guild summary configuration
 * @returns `TextDisplayBuilder` UI node
 */
export const GuildSummaryComponent: UIComponent<GuildSummaryProps> = ({
  guildData,
  storytellerDiscordIds,
  linkedChroniclesCount,
}) => {
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

  return TextBlockComponent({
    content:
      `# ⚙️ Server Settings — ${guildData.name}\n\n` +
      `Configure server-wide default permissions and manage your chronicles.\n\n` +
      `**Server-Wide Storyteller Roles:**\n${rolesText}\n\n` +
      `**Server-Wide Storyteller Users:**\n${usersText}\n\n` +
      `**Total Chronicles Linked:** ${linkedChroniclesCount}\n`,
  });
};
