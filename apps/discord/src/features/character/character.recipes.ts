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
  ConfirmationBarComponent,
  DividerComponent,
  TextBlockComponent,
  TrackerQuickButtonsComponent,
} from "../../ui";
import {
  CharacterControl,
  CharacterQuickAction,
} from "./character-session.definitions";
import type { ModalActionRowComponentBuilder } from "discord.js";
import type { Snowflake } from "@realm/common";
import type { ScreenRecipe } from "../../ui";
import type { CharacterSessionStateData } from "./character-session.definitions";

/**
 * Handler ID shared across all `/character` recipes and `CharacterCoordinator`.
 */
export const CHARACTER_HANDLER_ID = "character";

/**
 * Sample clans available during Step 2 of the mock creation wizard.
 */
const AVAILABLE_CLANS = [
  "Brujah",
  "Gangrel",
  "Lasombra",
  "Malkavian",
  "Nosferatu",
  "Toreador",
  "Tremere",
  "Ventrue",
] as const;

/**
 * Formats a `Splat` enum key into a human-readable game line title.
 */
function formatSplatLabel(key: string): string {
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
 * Standard props passed into `/character` session screen recipes.
 */
export interface CharacterSessionRecipeProps {
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Current validated character session state */
  state: CharacterSessionStateData;
  /**
   * Optional flag indicating whether a secondary ephemeral tracker follow-up
   * should also be emitted alongside the primary response.
   */
  emitTrackerFollowUp?: boolean;
}

/**
 * Screen Recipe: Typo-Prevention Confirmation Prompt when a character name does not exist yet.
 *
 * @param props - Session ID and draft state
 * @returns `RenderEnvelope`
 *
 * @example
 * ```typescript
 * renderEngine.build(ConfirmCreateCharacterRecipe, { sessionId, state })
 * ```
 */
export const ConfirmCreateCharacterRecipe: ScreenRecipe<
  CharacterSessionRecipeProps
> = ({ sessionId, state }) => ({
  primary: {
    ephemeral: true,
    body: [
      TextBlockComponent({
        content:
          `# New Character Detected\n\n` +
          `No character named **${state.characterName}** was found in your roster.\n` +
          `Would you like to start creating **${state.characterName}** now?`,
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
 * Screen Recipe: Step 1 of the Creation Wizard (Splat Selection).
 *
 * @param props - Session ID and draft state
 * @returns `RenderEnvelope`
 *
 * @example
 * ```typescript
 * renderEngine.build(SelectSplatRecipe, { sessionId, state })
 * ```
 */
export const SelectSplatRecipe: ScreenRecipe<CharacterSessionRecipeProps> = ({
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
            `# Character Creation — Step 1 of 2\n\n` +
            `Creating **${state.characterName}**\n` +
            `Select a game line (Splat) from the dropdown below:`,
        }),
        DividerComponent(),
        selectRow,
      ],
    },
  };
};

/**
 * Screen Recipe: Step 2 of the Creation Wizard (Clan / Lineage Selection).
 *
 * @param props - Session ID and draft state
 * @returns `RenderEnvelope`
 *
 * @example
 * ```typescript
 * renderEngine.build(SelectClanRecipe, { sessionId, state })
 * ```
 */
export const SelectClanRecipe: ScreenRecipe<CharacterSessionRecipeProps> = ({
  sessionId,
  state,
}) => {
  const clanMenu = new StringSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHARACTER_HANDLER_ID,
        sessionId,
        CharacterControl.SelectClanMenu
      )
    )
    .setPlaceholder("Choose a Clan...")
    .addOptions(
      AVAILABLE_CLANS.map((clan) =>
        new StringSelectMenuOptionBuilder().setLabel(clan).setValue(clan)
      )
    );

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(clanMenu);

  return {
    primary: {
      ephemeral: true,
      body: [
        TextBlockComponent({
          content:
            `# Character Creation — Step 2 of 2\n\n` +
            `**Character:** ${state.characterName}\n` +
            `**System:** \`${state.splat ?? Splat.Vampire5th}\`\n\n` +
            `Select your character's Clan or Lineage to finalize creation and open the interactive sheet:`,
        }),
        DividerComponent(),
        selectRow,
      ],
    },
  };
};

/**
 * Screen Recipe: Interactive Character Editor Home Dashboard.
 *
 * Composes reusable UI Components (`CharacterIdentityComponent`, `CharacterTrackersComponent`,
 * `TrackerQuickButtonsComponent`) and supports conditional ephemeral `followUps` when
 * `emitTrackerFollowUp` is enabled.
 *
 * @param props - Session ID, character state, and optional follow-up flag
 * @returns `RenderEnvelope`
 *
 * @example
 * ```typescript
 * renderEngine.build(CharacterEditorHomeRecipe, { sessionId, state })
 * ```
 */
export const CharacterEditorHomeRecipe: ScreenRecipe<
  CharacterSessionRecipeProps
> = ({ sessionId, state, emitTrackerFollowUp }) => {
  const quickActionSelect = new StringSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHARACTER_HANDLER_ID,
        sessionId,
        CharacterControl.QuickActionMenu
      )
    )
    .setPlaceholder("⚡ Select a quick action or editor tool...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("🎲 Perform Rouse Check")
        .setDescription(
          "Roll 1d10 (Difficulty 6) — increases Hunger on failure"
        )
        .setValue(CharacterQuickAction.RouseCheck),
      new StringSelectMenuOptionBuilder()
        .setLabel("🩹 Mend Superficial Health")
        .setDescription(
          "Perform a Rouse Check and heal 1 point of Superficial Health damage"
        )
        .setValue(CharacterQuickAction.MendSuperficial),
      new StringSelectMenuOptionBuilder()
        .setLabel("✏️ Edit Concept & Ambition (Modal)")
        .setDescription(
          "Open a popup form to update your character's biography traits"
        )
        .setValue(CharacterQuickAction.OpenBioModal)
    );

  const quickActionRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      quickActionSelect
    );

  const trackerButtons = TrackerQuickButtonsComponent({
    handlerId: CHARACTER_HANDLER_ID,
    sessionId,
    hunger: state.hunger,
    willpowerMax: state.willpowerMax,
    willpowerSuperficial: state.willpowerSuperficial,
    decHungerControl: CharacterControl.DecreaseHunger,
    incHungerControl: CharacterControl.IncreaseHunger,
    decWillpowerControl: CharacterControl.DecreaseWillpower,
    incWillpowerControl: CharacterControl.IncreaseWillpower,
  });

  return {
    primary: {
      ephemeral: true,
      body: [
        CharacterIdentityComponent({
          characterName: state.characterName,
          splat: state.splat,
          clan: state.clan,
          generation: state.generation,
          concept: state.concept,
          ambition: state.ambition,
          bannerText: state.lastActionBanner,
        }),
        DividerComponent(),
        CharacterTrackersComponent({
          hunger: state.hunger,
          healthMax: state.healthMax,
          healthSuperficial: state.healthSuperficial,
          willpowerMax: state.willpowerMax,
          willpowerSuperficial: state.willpowerSuperficial,
        }),
        DividerComponent(),
        trackerButtons,
        quickActionRow,
      ],
    },
    followUps: [
      Boolean(emitTrackerFollowUp) && {
        ephemeral: true,
        body: [
          ActionBannerComponent({ text: state.lastActionBanner }),
          CharacterTrackersComponent({
            hunger: state.hunger,
            healthMax: state.healthMax,
            healthSuperficial: state.healthSuperficial,
            willpowerMax: state.willpowerMax,
            willpowerSuperficial: state.willpowerSuperficial,
          }),
          trackerButtons,
        ],
      },
    ],
  };
};

/**
 * Screen Recipe: Cancelled character creation view.
 *
 * @param props - Character name whose creation was aborted
 * @returns `RenderEnvelope`
 *
 * @example
 * ```typescript
 * renderEngine.build(CharacterCancelledRecipe, { characterName: "Viktor" })
 * ```
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
 * Screen Recipe: Discord Modal popup for editing a character's Concept and Ambition.
 *
 * @param props - Session ID and current character state
 * @returns `RenderEnvelope` of `kind: "modal"`
 *
 * @example
 * ```typescript
 * renderEngine.build(EditCharacterBioModalRecipe, { sessionId, state })
 * ```
 */
export const EditCharacterBioModalRecipe: ScreenRecipe<
  CharacterSessionRecipeProps
> = ({ sessionId, state }) => {
  const conceptInput = new TextInputBuilder()
    .setCustomId("concept")
    .setLabel("Character Concept")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setValue(state.concept);

  const ambitionInput = new TextInputBuilder()
    .setCustomId("ambition")
    .setLabel("Current Ambition")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(150)
    .setValue(state.ambition);

  const modal = new ModalBuilder()
    .setCustomId(
      encodeSessionCustomId(
        CHARACTER_HANDLER_ID,
        sessionId,
        CharacterControl.EditBioModal
      )
    )
    .setTitle(`Edit ${state.characterName}`)
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
