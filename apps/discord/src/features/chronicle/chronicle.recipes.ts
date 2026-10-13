import {
  ActionBannerComponent,
  BackButtonComponent,
  ChronicleDashboardActionsComponent,
  ChronicleSelectComponent,
  ChronicleStorytellerSelectorsComponent,
  ChronicleSummaryComponent,
  ConfirmationBarComponent,
  DividerComponent,
  GameEditionSelectComponent,
  TextBlockComponent,
  createChronicleCreateModal,
  formatGameEditionLabel,
  formatMentionsList,
} from "../../ui";
import { ChronicleControl } from "./chronicle-session.definitions";
import type { ChronicleData, Snowflake } from "@realm/common";
import type { GameEdition } from "@realm/common";
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
}) => ({
  primary: {
    ephemeral: true,
    body: [
      ChronicleSummaryComponent({
        activeChronicle,
        linkedChroniclesCount,
        storytellerUsersCount,
      }),
      ActionBannerComponent({ text: state.lastActionBanner }),
      DividerComponent(),
      ChronicleDashboardActionsComponent({
        handlerId: CHRONICLE_HANDLER_ID,
        sessionId,
        linkedChroniclesCount,
      }),
    ],
  },
});

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
> = ({ sessionId, activeChronicleId, chronicles }) => ({
  primary: {
    ephemeral: true,
    body: [
      TextBlockComponent({
        content:
          `# 🔄 Switch Active Chronicle\n\n` +
          `Select which chronicle you want to view and manage:`,
      }),
      DividerComponent(),
      ChronicleSelectComponent({
        handlerId: CHRONICLE_HANDLER_ID,
        sessionId,
        chronicles,
        activeChronicleId,
      }),
      BackButtonComponent({
        handlerId: CHRONICLE_HANDLER_ID,
        sessionId,
        control: ChronicleControl.NavBack,
      }),
    ],
  },
});

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
}) => ({
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
      GameEditionSelectComponent({
        handlerId: CHRONICLE_HANDLER_ID,
        sessionId,
        currentVersion,
      }),
      BackButtonComponent({
        handlerId: CHRONICLE_HANDLER_ID,
        sessionId,
        control: ChronicleControl.NavBack,
      }),
    ],
  },
});

/**
 * Props for storyteller management view.
 */
export interface ManageStorytellersRecipeProps {
  sessionId: Snowflake;
  activeChronicle: ChronicleData;
  storytellerDiscordIds: Snowflake[];
}

/**
 * Screen Recipe: Manage Storyteller roles and individual users for this chronicle.
 */
export const ManageStorytellersRecipe: ScreenRecipe<
  ManageStorytellersRecipeProps
> = ({ sessionId, activeChronicle, storytellerDiscordIds }) => {
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
        ChronicleStorytellerSelectorsComponent({
          handlerId: CHRONICLE_HANDLER_ID,
          sessionId,
        }),
        BackButtonComponent({
          handlerId: CHRONICLE_HANDLER_ID,
          sessionId,
          control: ChronicleControl.NavBack,
        }),
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
}> = ({ sessionId }) => ({
  kind: "modal",
  modal: createChronicleCreateModal({
    handlerId: CHRONICLE_HANDLER_ID,
    sessionId,
  }),
});
