import {
  ActionBannerComponent,
  CharacterIdentityComponent,
  CharacterQuickActionsComponent,
  CharacterTrackersComponent,
  CharacterTraitsComponent,
  ConfirmationBarComponent,
  DividerComponent,
  SheetTabBarComponent,
  SplatSelectComponent,
  TextBlockComponent,
  TrackerQuickButtonsComponent,
  createCharacterBioModal,
} from "../../ui";
import {
  CharacterControl,
  CharacterSheetTab,
} from "./character-session.definitions";
import type { CharacterData, Snowflake } from "@realm/common";
import type { ScreenRecipe } from "../../ui";
import type { CharacterSessionStateData } from "./character-session.definitions";

/**
 * Handler ID shared across all `/character` recipes and `CharacterCoordinator`.
 */
export const CHARACTER_HANDLER_ID = "character";

/**
 * Standard props passed into `/character` creation recipes.
 */
export interface CharacterCreationRecipeProps {
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Current validated character session state */
  state: CharacterSessionStateData;
}

/**
 * Standard props passed into `/character` interactive sheet editor recipes.
 */
export interface CharacterSheetRecipeProps {
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Full authoritative character record from repository */
  character: CharacterData;
  /** Current concept (from session or sheet) */
  concept?: string;
  /** Current ambition (from session or sheet) */
  ambition?: string;
  /** Optional status or roll banner */
  bannerText?: string;
  /**
   * Optional flag indicating whether a secondary ephemeral tracker follow-up
   * should also be emitted alongside the primary response.
   */
  emitTrackerFollowUp?: boolean;
}

/**
 * Screen Recipe: Typo-Prevention Confirmation Prompt when a character name does not exist yet.
 */
export const ConfirmCreateCharacterRecipe: ScreenRecipe<
  CharacterCreationRecipeProps
> = ({ sessionId, state }) => ({
  primary: {
    ephemeral: true,
    body: [
      TextBlockComponent({
        content:
          `# New Character Detected\n\n` +
          `No character named **${state.characterName}** was found in your roster.\n` +
          `Would you like to create **${state.characterName}** now?`,
      }),
      DividerComponent(),
      ConfirmationBarComponent({
        handlerId: CHARACTER_HANDLER_ID,
        sessionId,
        confirmControl: CharacterControl.ConfirmCreateYes,
        cancelControl: CharacterControl.ConfirmCreateCancel,
        confirmLabel: `Create "${state.characterName}"`,
      }),
    ],
  },
});

/**
 * Screen Recipe: Splat Selection (Step 1 of Creation Wizard).
 */
export const SelectSplatRecipe: ScreenRecipe<CharacterCreationRecipeProps> = ({
  sessionId,
  state,
}) => ({
  primary: {
    ephemeral: true,
    body: [
      TextBlockComponent({
        content:
          `# Character Creation\n\n` +
          `Creating **${state.characterName}**\n` +
          `Select a game system from the dropdown below to initialize your character:`,
      }),
      DividerComponent(),
      SplatSelectComponent({
        handlerId: CHARACTER_HANDLER_ID,
        sessionId,
      }),
    ],
  },
});

/**
 * Screen Recipe: Interactive Character Editor Dashboard (Trackers Tab).
 */
export const CharacterEditorHomeRecipe: ScreenRecipe<
  CharacterSheetRecipeProps
> = ({
  sessionId,
  character,
  concept,
  ambition,
  bannerText,
  emitTrackerFollowUp,
}) => ({
  primary: {
    ephemeral: true,
    body: [
      CharacterIdentityComponent({
        characterName: character.name,
        splat: character.splat,
        concept: concept ?? "Unwritten Soul",
        ambition: ambition ?? "Survive the night",
        bannerText,
      }),
      SheetTabBarComponent({
        handlerId: CHARACTER_HANDLER_ID,
        sessionId,
        activeTab: CharacterSheetTab.Trackers,
      }),
      DividerComponent(),
      CharacterTrackersComponent({ character }),
      DividerComponent(),
      TrackerQuickButtonsComponent({
        handlerId: CHARACTER_HANDLER_ID,
        sessionId,
        character,
      }),
      CharacterQuickActionsComponent({
        handlerId: CHARACTER_HANDLER_ID,
        sessionId,
        character,
      }),
    ],
  },
  followUps: [
    Boolean(emitTrackerFollowUp) && {
      ephemeral: true,
      body: [
        ActionBannerComponent({ text: bannerText }),
        CharacterTrackersComponent({ character }),
        TrackerQuickButtonsComponent({
          handlerId: CHARACTER_HANDLER_ID,
          sessionId,
          character,
        }),
      ],
    },
  ],
});

/**
 * Screen Recipe: Interactive Character Traits Tab (Attributes & Skills).
 */
export const CharacterTraitsRecipe: ScreenRecipe<CharacterSheetRecipeProps> = ({
  sessionId,
  character,
  concept,
  ambition,
  bannerText,
}) => ({
  primary: {
    ephemeral: true,
    body: [
      CharacterIdentityComponent({
        characterName: character.name,
        splat: character.splat,
        concept: concept ?? "Unwritten Soul",
        ambition: ambition ?? "Survive the night",
        bannerText,
      }),
      SheetTabBarComponent({
        handlerId: CHARACTER_HANDLER_ID,
        sessionId,
        activeTab: CharacterSheetTab.Traits,
      }),
      DividerComponent(),
      CharacterTraitsComponent({ character }),
    ],
  },
});

/**
 * Screen Recipe: Character Safe Deletion Confirmation Tab.
 */
export const CharacterDeleteConfirmRecipe: ScreenRecipe<
  CharacterSheetRecipeProps
> = ({ sessionId, character, concept, ambition, bannerText }) => ({
  primary: {
    ephemeral: true,
    body: [
      CharacterIdentityComponent({
        characterName: character.name,
        splat: character.splat,
        concept: concept ?? "Unwritten Soul",
        ambition: ambition ?? "Survive the night",
        bannerText,
      }),
      SheetTabBarComponent({
        handlerId: CHARACTER_HANDLER_ID,
        sessionId,
        activeTab: CharacterSheetTab.Delete,
      }),
      DividerComponent(),
      TextBlockComponent({
        content:
          `# ⚠️ Danger Zone: Delete Character\n\n` +
          `Are you sure you want to permanently delete **${character.name}**?\n` +
          `**All sheet data, attributes, and tracker states will be permanently deleted.** This action cannot be undone.`,
      }),
      DividerComponent(),
      ConfirmationBarComponent({
        handlerId: CHARACTER_HANDLER_ID,
        sessionId,
        confirmControl: CharacterControl.DeleteConfirmYes,
        cancelControl: CharacterControl.DeleteConfirmCancel,
        confirmLabel: `Permanently Delete "${character.name}"`,
        cancelLabel: "Cancel",
      }),
    ],
  },
});

/**
 * Screen Recipe: Cancelled character creation view.
 */
export const CharacterCancelledRecipe: ScreenRecipe<{
  characterName: string;
}> = ({ characterName }) => ({
  primary: {
    ephemeral: true,
    body: TextBlockComponent({
      content: `🚫 Character creation for **${characterName}** was cancelled.`,
    }),
  },
});

/**
 * Screen Recipe: Confirmed character deletion view.
 */
export const CharacterDeletedRecipe: ScreenRecipe<{
  characterName: string;
}> = ({ characterName }) => ({
  primary: {
    ephemeral: true,
    body: TextBlockComponent({
      content: `🗑️ Character **${characterName}** has been permanently deleted.`,
    }),
  },
});

/**
 * Screen Recipe: Discord Modal popup for editing Concept and Ambition.
 */
export const EditCharacterBioModalRecipe: ScreenRecipe<{
  sessionId: Snowflake;
  characterName: string;
  concept?: string;
  ambition?: string;
}> = ({ sessionId, characterName, concept, ambition }) => ({
  kind: "modal",
  modal: createCharacterBioModal({
    handlerId: CHARACTER_HANDLER_ID,
    sessionId,
    characterName,
    concept,
    ambition,
  }),
});
