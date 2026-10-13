import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";
import { GameEdition } from "@realm/common";
import { encodeSessionCustomId } from "../../framework";
import {
  ActionBannerComponent,
  ConfirmationBarComponent,
  DividerComponent,
  TextBlockComponent,
} from "../../ui";
import { ChronicleControl } from "./chronicle-session.definitions";
import type { ModalActionRowComponentBuilder } from "discord.js";
import type { ChronicleData, Snowflake } from "@realm/common";
import type { ScreenRecipe } from "../../ui";
import type { ChronicleSessionStateData } from "./chronicle-session.definitions";

/**
 * Handler ID for `/chronicle` commands and custom ID routing.
 */
export const CHRONICLE_HANDLER_ID = "chronicle";

/**
 * Props for rendering the Chronicle Dashboard recipe.
 */
export interface ChronicleDashboardRecipeProps {
  sessionId: Snowflake;
  state: ChronicleSessionStateData;
  activeChronicle: ChronicleData;
  linkedChroniclesCount: number;
  storytellerUsersCount: number;
}

/**
 * Formats a `GameEdition` value into a user-friendly label.
 */
export function formatGameEditionLabel(edition: GameEdition): string {
  switch (edition) {
    case GameEdition.Fifth:
      return "5th Edition (V5 / W5 / H5)";
    case GameEdition.Twentieth:
      return "20th Anniversary (V20 / W20 / M20)";
    case GameEdition.Cod:
      return "Chronicles of Darkness (CofD / VtR)";
    default:
      return edition;
  }
}

/**
 * Screen Recipe: Chronicle Settings Dashboard.
 */
export const ChronicleDashboardRecipe: ScreenRecipe<
  ChronicleDashboardRecipeProps
> = ({
  sessionId,
  state,
  activeChronicle,
  linkedChroniclesCount,
  storytellerUsersCount,
}) => {
  const switchBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHRONICLE_HANDLER_ID,
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
        CHRONICLE_HANDLER_ID,
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
        CHRONICLE_HANDLER_ID,
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
        CHRONICLE_HANDLER_ID,
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
        CHRONICLE_HANDLER_ID,
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

  const editionText = formatGameEditionLabel(activeChronicle.defaultVersion);
  const stRolesCount = activeChronicle.storytellerRoleIds.length;

  return {
    primary: {
      ephemeral: true,
      body: [
        TextBlockComponent({
          content:
            `# 📖 Chronicle Settings — ${activeChronicle.name}\n\n` +
            `**Default Game Edition:** \`${editionText}\`\n` +
            `**Storyteller Roles:** ${stRolesCount} assigned\n` +
            `**Storyteller Users:** ${storytellerUsersCount} assigned\n` +
            `**Total Server Chronicles:** ${linkedChroniclesCount}\n`,
        }),
        ActionBannerComponent({ text: state.lastActionBanner }),
        DividerComponent(),
        topRow,
        bottomRow,
      ],
    },
  };
};

/**
 * Props for the chronicle selection view.
 */
export interface SelectActiveChronicleRecipeProps {
  sessionId: Snowflake;
  activeChronicleId: Snowflake;
  chronicles: ChronicleData[];
}

/**
 * Screen Recipe: Select active chronicle to manage.
 */
export const SelectActiveChronicleRecipe: ScreenRecipe<
  SelectActiveChronicleRecipeProps
> = ({ sessionId, activeChronicleId, chronicles }) => {
  const MAX_OPTIONS = 25;
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHRONICLE_HANDLER_ID,
        sessionId,
        ChronicleControl.SwitchChronicleMenu
      )
    )
    .setPlaceholder("Choose a chronicle to switch to...")
    .addOptions(
      chronicles.slice(0, MAX_OPTIONS).map((c) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(c.name.slice(0, 100))
          .setDescription(`Edition: ${c.defaultVersion}`.slice(0, 100))
          .setValue(c.id)
          .setDefault(c.id === activeChronicleId)
      )
    );

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const backBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHRONICLE_HANDLER_ID,
        sessionId,
        ChronicleControl.NavBack
      )
    )
    .setLabel("Back")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("⬅️");

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn);

  return {
    primary: {
      ephemeral: true,
      body: [
        TextBlockComponent({
          content:
            `# 🔄 Switch Active Chronicle\n\n` +
            `Select which chronicle you want to view and manage:`,
        }),
        DividerComponent(),
        selectRow,
        navRow,
      ],
    },
  };
};

/**
 * Props for the version selection view.
 */
export interface SelectVersionRecipeProps {
  sessionId: Snowflake;
  currentVersion: GameEdition;
}

/**
 * Screen Recipe: Choose default game version/edition for the chronicle.
 */
export const SelectVersionRecipe: ScreenRecipe<SelectVersionRecipeProps> = ({
  sessionId,
  currentVersion,
}) => {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHRONICLE_HANDLER_ID,
        sessionId,
        ChronicleControl.SelectVersionMenu
      )
    )
    .setPlaceholder("Choose default game edition...")
    .addOptions(
      Object.values(GameEdition).map((version) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(formatGameEditionLabel(version))
          .setValue(version)
          .setDefault(version === currentVersion)
      )
    );

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const backBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHRONICLE_HANDLER_ID,
        sessionId,
        ChronicleControl.NavBack
      )
    )
    .setLabel("Back")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("⬅️");

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn);

  return {
    primary: {
      ephemeral: true,
      body: [
        TextBlockComponent({
          content:
            `# ⚙️ Configure Default Game Edition\n\n` +
            `Current edition: **${formatGameEditionLabel(currentVersion)}**\n\n` +
            `Select the default edition for this chronicle:`,
        }),
        DividerComponent(),
        selectRow,
        navRow,
      ],
    },
  };
};

/**
 * Props for storyteller management view.
 */
export interface ManageStorytellersRecipeProps {
  sessionId: Snowflake;
  activeChronicle: ChronicleData;
  storytellerDiscordIds: Snowflake[];
}

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
 * Screen Recipe: Manage Storyteller roles and individual users for this chronicle.
 */
export const ManageStorytellersRecipe: ScreenRecipe<
  ManageStorytellersRecipeProps
> = ({ sessionId, activeChronicle, storytellerDiscordIds }) => {
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHRONICLE_HANDLER_ID,
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
        CHRONICLE_HANDLER_ID,
        sessionId,
        ChronicleControl.AddStorytellerUserMenu
      )
    )
    .setPlaceholder("Select a user to toggle Storyteller status...")
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
      encodeSessionCustomId(
        CHRONICLE_HANDLER_ID,
        sessionId,
        ChronicleControl.NavBack
      )
    )
    .setLabel("Back")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("⬅️");

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn);

  const rolesText = formatMentionsList(
    activeChronicle.storytellerRoleIds,
    "@&",
    "*No chronicle roles assigned*"
  );

  const usersText = formatMentionsList(
    storytellerDiscordIds,
    "@",
    "*No explicit user storytellers assigned*"
  );

  return {
    primary: {
      ephemeral: true,
      body: [
        TextBlockComponent({
          content:
            `# 🎭 Manage Storytellers — ${activeChronicle.name}\n\n` +
            `**Chronicle Storyteller Roles:**\n${rolesText}\n\n` +
            `**Chronicle Storyteller Users:**\n${usersText}\n\n` +
            `Use the selectors below to assign or remove Storytellers:`,
        }),
        DividerComponent(),
        roleRow,
        userRow,
        navRow,
      ],
    },
  };
};

/**
 * Screen Recipe: Confirm chronicle deletion.
 */
export const ConfirmDeleteChronicleRecipe: ScreenRecipe<{
  sessionId: Snowflake;
  chronicle: ChronicleData;
  isLastChronicle: boolean;
}> = ({ sessionId, chronicle, isLastChronicle }) => {
  const warningNote = isLastChronicle
    ? `\n\n⚠️ **Notice:** **${chronicle.name}** is the **only** chronicle linked to this server. Deleting it will automatically create a fresh default chronicle.`
    : "";

  return {
    primary: {
      ephemeral: true,
      body: [
        TextBlockComponent({
          content:
            `# 🗑️ Delete Chronicle\n\n` +
            `Are you sure you want to delete **${chronicle.name}**?` +
            warningNote,
        }),
        DividerComponent(),
        ConfirmationBarComponent({
          handlerId: CHRONICLE_HANDLER_ID,
          sessionId,
          confirmControl: ChronicleControl.ConfirmDeleteYes,
          cancelControl: ChronicleControl.ConfirmDeleteCancel,
          confirmLabel: `Delete "${chronicle.name}"`,
          cancelLabel: "Cancel",
        }),
      ],
    },
  };
};

/**
 * Screen Recipe: Modal for creating a new chronicle.
 */
export const CreateChronicleModalRecipe: ScreenRecipe<{
  sessionId: Snowflake;
}> = ({ sessionId }) => {
  const nameInput = new TextInputBuilder()
    .setCustomId("chronicleName")
    .setLabel("Chronicle Name")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g., Boston By Night")
    .setMinLength(2)
    .setMaxLength(50)
    .setRequired(true);

  const row =
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
      nameInput
    );

  const modal = new ModalBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHRONICLE_HANDLER_ID,
        sessionId,
        ChronicleControl.SubmitCreateModal
      )
    )
    .setTitle("Create New Chronicle")
    .addComponents(row);

  return {
    kind: "modal",
    modal,
  };
};
