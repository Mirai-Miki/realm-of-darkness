import {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { Splat } from "@realm/common";
import { encodeSessionCustomId } from "../../framework";
import {
  ActionBannerComponent,
  CharacterIdentityComponent,
  CharacterTrackersComponent,
  CharacterTraitsComponent,
  ConfirmationBarComponent,
  DividerComponent,
  SheetTabBarComponent,
  TextBlockComponent,
  TrackerQuickButtonsComponent,
} from "../../ui";
import {
  CharacterControl,
  CharacterQuickAction,
  CharacterSheetTab,
} from "./character-session.definitions";
import type { ModalActionRowComponentBuilder } from "discord.js";
import type { CharacterData, Snowflake } from "@realm/common";
import type { ScreenRecipe } from "../../ui";
import type { CharacterSessionStateData } from "./character-session.definitions";

/**
 * Handler ID shared across all `/character` recipes and `CharacterCoordinator`.
 */
export const CHARACTER_HANDLER_ID = "character";

/**
 * Formats a `Splat` enum key into a human-readable game line title.
 */
export function formatSplatLabel(key: string): string {
  const match = key.match(/^([A-Za-z]+)(20th|5th|CoD)?$/);
  if (!match) return key;

  const [, gameLine, edition] = match;
  const gameLineName = (gameLine ?? key).replace(/([A-Z])/g, " $1").trim();

  if (edition === "20th") {
    return `${gameLineName} (20th Anniversary)`;
  }
  if (edition === "5th") {
    return `${gameLineName} (5th Edition)`;
  }
  if (edition === "CoD") {
    return `${gameLineName} (Chronicles of Darkness)`;
  }

  return gameLineName;
}

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
}) => {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHARACTER_HANDLER_ID,
        sessionId,
        CharacterControl.SelectSplatMenu
      )
    )
    .setPlaceholder("Choose a character type / game line...")
    .addOptions(
      Object.entries(Splat).map(([key, value]) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(formatSplatLabel(key))
          .setValue(value)
      )
    );

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  return {
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
        selectRow,
      ],
    },
  };
};

/**
 * Builds quick action dropdown options appropriate to the character's splat.
 */
function buildQuickActionOptions(character: CharacterData) {
  const options: StringSelectMenuOptionBuilder[] = [];

  if (character.splat === Splat.Vampire5th) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel("🎲 Perform Rouse Check")
        .setDescription(
          "Roll 1d10 (Difficulty 6) — increases Hunger on failure"
        )
        .setValue(CharacterQuickAction.RouseCheck),
      new StringSelectMenuOptionBuilder()
        .setLabel("🩹 Mend Superficial Health")
        .setDescription("Rouse blood to heal 1 superficial health damage")
        .setValue(CharacterQuickAction.MendSuperficial)
    );
  } else if (character.splat === Splat.Werewolf5th) {
    const isCrinos = (character as { form?: string }).form === "Crinos";
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(isCrinos ? "👤 Shift to Homid" : "🐺 Shift to Crinos")
        .setDescription(
          isCrinos
            ? "Revert to human form (resets health modifier)"
            : "Shift into war form (+4 Health boxes)"
        )
        .setValue(
          isCrinos
            ? CharacterQuickAction.ShiftHomid
            : CharacterQuickAction.ShiftCrinos
        ),
      new StringSelectMenuOptionBuilder()
        .setLabel("🩹 Mend Superficial Health")
        .setDescription("Heal 1 superficial health damage")
        .setValue(CharacterQuickAction.MendSuperficial)
    );
  } else {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel("🩹 Heal Damage")
        .setDescription("Heal 1 health damage box")
        .setValue(CharacterQuickAction.HealDamage)
    );
  }

  options.push(
    new StringSelectMenuOptionBuilder()
      .setLabel("✏️ Edit Concept & Ambition (Modal)")
      .setDescription(
        "Open a popup form to update your character's biography traits"
      )
      .setValue(CharacterQuickAction.OpenBioModal)
  );

  return options;
}

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
}) => {
  const quickActionSelect = new StringSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHARACTER_HANDLER_ID,
        sessionId,
        CharacterControl.QuickActionMenu
      )
    )
    .setPlaceholder("⚡ Select an action or editor tool...")
    .addOptions(buildQuickActionOptions(character));

  const quickActionRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      quickActionSelect
    );

  const tabBar = SheetTabBarComponent({
    handlerId: CHARACTER_HANDLER_ID,
    sessionId,
    activeTab: CharacterSheetTab.Trackers,
  });

  const trackerButtons = TrackerQuickButtonsComponent({
    handlerId: CHARACTER_HANDLER_ID,
    sessionId,
    character,
  });

  return {
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
        tabBar,
        DividerComponent(),
        CharacterTrackersComponent({ character }),
        DividerComponent(),
        trackerButtons,
        quickActionRow,
      ],
    },
    followUps: [
      Boolean(emitTrackerFollowUp) && {
        ephemeral: true,
        body: [
          ActionBannerComponent({ text: bannerText }),
          CharacterTrackersComponent({ character }),
          trackerButtons,
        ],
      },
    ],
  };
};

/**
 * Screen Recipe: Interactive Character Traits Tab (Attributes & Skills).
 */
export const CharacterTraitsRecipe: ScreenRecipe<CharacterSheetRecipeProps> = ({
  sessionId,
  character,
  concept,
  ambition,
  bannerText,
}) => {
  const tabBar = SheetTabBarComponent({
    handlerId: CHARACTER_HANDLER_ID,
    sessionId,
    activeTab: CharacterSheetTab.Traits,
  });

  return {
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
        tabBar,
        DividerComponent(),
        CharacterTraitsComponent({ character }),
      ],
    },
  };
};

/**
 * Screen Recipe: Character Safe Deletion Confirmation Tab.
 */
export const CharacterDeleteConfirmRecipe: ScreenRecipe<
  CharacterSheetRecipeProps
> = ({ sessionId, character, concept, ambition, bannerText }) => {
  const tabBar = SheetTabBarComponent({
    handlerId: CHARACTER_HANDLER_ID,
    sessionId,
    activeTab: CharacterSheetTab.Delete,
  });

  return {
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
        tabBar,
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
  };
};

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
}> = ({ sessionId, characterName, concept, ambition }) => {
  const conceptInput = new TextInputBuilder()
    .setCustomId("concept")
    .setLabel("Character Concept")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setValue(concept ?? "Unwritten Soul");

  const ambitionInput = new TextInputBuilder()
    .setCustomId("ambition")
    .setLabel("Current Ambition")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(150)
    .setValue(ambition ?? "Survive the night");

  const modal = new ModalBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHARACTER_HANDLER_ID,
        sessionId,
        CharacterControl.EditBioModal
      )
    )
    .setTitle(`Edit ${characterName}`)
    .addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        conceptInput
      ),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        ambitionInput
      )
    );

  return {
    kind: "modal",
    modal,
  };
};
