import {
  CharacterNameSchema,
  SplatSchema,
  UserError,
  RealmError,
} from "@realm/common";
import {
  CharacterRepository,
  InteractionSessionRepository,
} from "@realm/repositories";
import {
  Character20th,
  Character5th,
  CharacterFactory,
  Vampire20th,
  Vampire5th,
  Werewolf5th,
} from "@realm/core";
import { logger } from "@realm/logger";
import {
  Coordinator,
  buildSlashCommandFromMdx,
  decodeSessionCustomId,
} from "../../framework";
import { renderEngine } from "../../ui";
import {
  CharacterControl,
  CharacterQuickAction,
  CharacterQuickActionSchema,
  CharacterSessionStateDataSchema,
  CharacterSheetTab,
  CharacterWorkflowStep,
} from "./character-session.definitions";
import type { CharacterSessionStateData } from "./character-session.definitions";
import {
  CHARACTER_HANDLER_ID,
  CharacterCancelledRecipe,
  CharacterDeleteConfirmRecipe,
  CharacterDeletedRecipe,
  CharacterEditorHomeRecipe,
  CharacterTraitsRecipe,
  ConfirmCreateCharacterRecipe,
  EditCharacterBioModalRecipe,
  SelectSplatRecipe,
} from "./character.recipes";
import type {
  AutocompleteContext,
  CommandContext,
  InterfaceContext,
} from "../../framework";
import type {
  CharacterData,
  ICharacterRepository,
  Snowflake,
} from "@realm/common";
import type { NormalizedRenderEnvelope } from "../../ui";
import type { CharacterEntity } from "@realm/core";

/**
 * Unified Coordinator for the `/character` command and all of its context-sensitive
 * stateless creation wizard and interactive sheet editor interactions.
 *
 * Key architectural features:
 * 1. **MDX Single Source of Truth**: Command definition is built directly from
 *    `packages/content/collections/documentation/discord/commands/character.mdx`.
 * 2. **PostgreSQL Stateless Sessions**: All wizard and editor state is stored in
 *    `interaction_sessions` via `InteractionSessionRepository` with a single uniform
 *    `customId` format (`character:{sessionId}:{control}`).
 * 3. **Authoritative Domain Persistence**: Hydrates real domain entities via `CharacterFactory`
 *    and persists changes to PostgreSQL through `CharacterRepository`.
 * 4. **Pure Render Engine Return Flow**: Returns `renderEngine.build(Recipe, props)`
 *    without performing direct Discord API calls.
 */
export class CharacterCoordinator extends Coordinator {
  /**
   * Command definition loaded directly from the MDX documentation SSOT.
   */
  public readonly data = buildSlashCommandFromMdx(CHARACTER_HANDLER_ID);

  private readonly sessionRepo: InteractionSessionRepository;
  private readonly characterRepo: ICharacterRepository;

  /**
   * Creates a new `CharacterCoordinator` instance.
   *
   * @param sessionRepo - Repository for PostgreSQL interaction session persistence
   * @param characterRepo - Repository for PostgreSQL character data persistence
   */
  constructor(
    sessionRepo?: InteractionSessionRepository,
    characterRepo?: ICharacterRepository
  ) {
    super();
    this.sessionRepo = sessionRepo ?? new InteractionSessionRepository();
    this.characterRepo = characterRepo ?? new CharacterRepository();
  }

  /**
   * Resolves the acting user's Snowflake ID from `ctx.actor` or falls back to the Discord user ID.
   */
  private resolveActorId(
    ctx: CommandContext | InterfaceContext | AutocompleteContext
  ): Snowflake {
    return ctx.actor?.id ?? ctx.interaction.user.id;
  }

  /**
   * Executes the initial `/character name:<name>` slash command and returns a
   * `NormalizedRenderEnvelope` for `InteractionRouter` + `InteractionDispatcher`.
   *
   * @param ctx - The Discord command context
   * @returns Normalized render envelope for either Editor Home or Confirm Create
   * @throws {UserError} If the entered character name fails validation
   */
  public async execute(ctx: CommandContext): Promise<NormalizedRenderEnvelope> {
    const { interaction } = ctx;
    const rawName = interaction.options.getString("name", true);
    const nameValidation = CharacterNameSchema.safeParse(rawName);

    if (!nameValidation.success) {
      throw new UserError(
        "Character names must be between 2 and 50 characters and contain valid letters.",
        {
          fields: {
            rawName,
            errors: nameValidation.error.message,
          },
        }
      );
    }

    const characterName = nameValidation.data;
    const userId = this.resolveActorId(ctx);
    const userCharacters = await this.characterRepo.findByUser(userId);
    const existing = userCharacters.find(
      (c) => c.name.toLowerCase() === characterName.toLowerCase()
    );

    if (existing) {
      const session = await this.sessionRepo.create(
        {
          userId,
          handlerId: this.handlerId,
          step: CharacterWorkflowStep.EditorHome,
          state: {
            characterId: existing.id,
            characterName: existing.name,
            splat: existing.splat,
            activeTab: CharacterSheetTab.Trackers,
            concept: "Unwritten Soul",
            ambition: "Survive the night",
          },
        },
        CharacterSessionStateDataSchema
      );

      logger.info("Opened existing character in interactive editor", {
        fields: {
          userId,
          characterName: existing.name,
          characterId: existing.id,
          sessionId: session.id,
        },
      });

      return renderEngine.build(CharacterEditorHomeRecipe, {
        sessionId: session.id,
        character: existing,
        concept: session.state.concept,
        ambition: session.state.ambition,
      });
    }

    // Character does not exist yet -> start at the typo-prevention confirmation window
    const initialDraft = CharacterSessionStateDataSchema.parse({
      characterName,
    });

    const session = await this.sessionRepo.create(
      {
        userId,
        handlerId: this.handlerId,
        step: CharacterWorkflowStep.ConfirmCreate,
        state: initialDraft,
      },
      CharacterSessionStateDataSchema
    );

    logger.info("Prompting user to confirm new character creation", {
      fields: {
        userId,
        characterName,
        sessionId: session.id,
      },
    });

    return renderEngine.build(ConfirmCreateCharacterRecipe, {
      sessionId: session.id,
      state: session.state,
    });
  }

  /**
   * Handles autocomplete for the `name` option on `/character`, returning
   * matching characters from the user's roster.
   *
   * @param ctx - The Discord autocomplete context
   */
  public override async autocomplete(ctx: AutocompleteContext): Promise<void> {
    const { interaction } = ctx;
    const focused = interaction.options.getFocused().toLowerCase();
    const userId = this.resolveActorId(ctx);

    const characters = await this.characterRepo.findByUser(userId);
    const matches = characters
      .filter((c) => c.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((c) => ({
        name: `${c.name} (${c.splat})`,
        value: c.name,
      }));

    await interaction.respond(matches);
  }

  /**
   * Handles all stateless button, select menu, and modal interactions for `/character`
   * and returns a `NormalizedRenderEnvelope`.
   *
   * @param ctx - The Discord interface context
   * @returns Normalized render envelope for the next screen or modal
   * @throws {UserError} If the session has expired or an invalid option was chosen
   * @throws {RealmError} If an unknown control identifier is encountered
   */
  public async handleInterface(
    ctx: InterfaceContext
  ): Promise<NormalizedRenderEnvelope> {
    const { interaction } = ctx;
    const { sessionId, control } = decodeSessionCustomId(interaction.customId);
    const userId = this.resolveActorId(ctx);

    const session = await this.sessionRepo.getActive(
      sessionId,
      CharacterSessionStateDataSchema,
      userId
    );

    // Modal quick action handler
    if (
      control === CharacterControl.QuickActionMenu &&
      interaction.isStringSelectMenu() &&
      interaction.values[0] === CharacterQuickAction.OpenBioModal
    ) {
      return renderEngine.build(EditCharacterBioModalRecipe, {
        sessionId: session.id,
        characterName: session.state.characterName,
        concept: session.state.concept,
        ambition: session.state.ambition,
      });
    }

    switch (control) {
      // ----------------------------------------------------------------------
      // Creation Wizard
      // ----------------------------------------------------------------------
      case CharacterControl.ConfirmCreateYes: {
        const updated = await this.sessionRepo.update(
          session.id,
          { step: CharacterWorkflowStep.SelectSplat },
          CharacterSessionStateDataSchema
        );
        return renderEngine.build(SelectSplatRecipe, {
          sessionId: updated.id,
          state: updated.state,
        });
      }

      case CharacterControl.ConfirmCreateCancel: {
        await this.sessionRepo.delete(session.id);
        return renderEngine.build(CharacterCancelledRecipe, {
          characterName: session.state.characterName,
        });
      }

      case CharacterControl.SelectSplatMenu: {
        if (!interaction.isStringSelectMenu()) {
          throw new RealmError("Expected StringSelectMenu for splat selection");
        }
        const parsedSplat = SplatSchema.safeParse(interaction.values[0]);
        if (!parsedSplat.success) {
          throw new UserError("Please select a valid character game line.");
        }

        // Initialize and persist default character in database
        const defaultData = CharacterFactory.createDefaultData({
          userId,
          name: session.state.characterName,
          splat: parsedSplat.data,
        });
        const created = await this.characterRepo.create(defaultData);

        const updated = await this.sessionRepo.update(
          session.id,
          {
            step: CharacterWorkflowStep.EditorHome,
            state: {
              ...session.state,
              characterId: created.id,
              splat: created.splat,
              activeTab: CharacterSheetTab.Trackers,
              lastActionBanner: `✨ Created **${created.name}**! Use the controls below to manage your sheet.`,
            },
          },
          CharacterSessionStateDataSchema
        );

        return renderEngine.build(CharacterEditorHomeRecipe, {
          sessionId: updated.id,
          character: created,
          concept: updated.state.concept,
          ambition: updated.state.ambition,
          bannerText: updated.state.lastActionBanner,
        });
      }

      // ----------------------------------------------------------------------
      // Sheet Tab Navigation
      // ----------------------------------------------------------------------
      case CharacterControl.TabTrackers: {
        const character = await this.loadAuthoritativeCharacter(
          session.state.characterId
        );
        const updated = await this.sessionRepo.update(
          session.id,
          {
            step: CharacterWorkflowStep.EditorHome,
            state: { ...session.state, activeTab: CharacterSheetTab.Trackers },
          },
          CharacterSessionStateDataSchema
        );

        return renderEngine.build(CharacterEditorHomeRecipe, {
          sessionId: updated.id,
          character,
          concept: updated.state.concept,
          ambition: updated.state.ambition,
          bannerText: updated.state.lastActionBanner,
        });
      }

      case CharacterControl.TabTraits: {
        const character = await this.loadAuthoritativeCharacter(
          session.state.characterId
        );
        const updated = await this.sessionRepo.update(
          session.id,
          {
            step: CharacterWorkflowStep.TraitsTab,
            state: { ...session.state, activeTab: CharacterSheetTab.Traits },
          },
          CharacterSessionStateDataSchema
        );

        return renderEngine.build(CharacterTraitsRecipe, {
          sessionId: updated.id,
          character,
          concept: updated.state.concept,
          ambition: updated.state.ambition,
          bannerText: updated.state.lastActionBanner,
        });
      }

      case CharacterControl.TabDelete: {
        const character = await this.loadAuthoritativeCharacter(
          session.state.characterId
        );
        const updated = await this.sessionRepo.update(
          session.id,
          {
            step: CharacterWorkflowStep.DeleteConfirm,
            state: { ...session.state, activeTab: CharacterSheetTab.Delete },
          },
          CharacterSessionStateDataSchema
        );

        return renderEngine.build(CharacterDeleteConfirmRecipe, {
          sessionId: updated.id,
          character,
          concept: updated.state.concept,
          ambition: updated.state.ambition,
        });
      }

      // ----------------------------------------------------------------------
      // Character Deletion
      // ----------------------------------------------------------------------
      case CharacterControl.DeleteConfirmYes: {
        if (session.state.characterId) {
          await this.characterRepo.delete(session.state.characterId);
        }
        await this.sessionRepo.delete(session.id);
        return renderEngine.build(CharacterDeletedRecipe, {
          characterName: session.state.characterName,
        });
      }

      case CharacterControl.DeleteConfirmCancel: {
        const character = await this.loadAuthoritativeCharacter(
          session.state.characterId
        );
        const updated = await this.sessionRepo.update(
          session.id,
          {
            step: CharacterWorkflowStep.EditorHome,
            state: { ...session.state, activeTab: CharacterSheetTab.Trackers },
          },
          CharacterSessionStateDataSchema
        );

        return renderEngine.build(CharacterEditorHomeRecipe, {
          sessionId: updated.id,
          character,
          concept: updated.state.concept,
          ambition: updated.state.ambition,
        });
      }

      // ----------------------------------------------------------------------
      // Bio Modal Submission
      // ----------------------------------------------------------------------
      case CharacterControl.EditBioModal: {
        if (!interaction.isModalSubmit()) {
          throw new RealmError("Expected ModalSubmitInteraction for bio modal");
        }
        const concept = interaction.fields.getTextInputValue("concept").trim();
        const ambition = interaction.fields
          .getTextInputValue("ambition")
          .trim();

        if (!concept || !ambition) {
          throw new UserError("Both Concept and Ambition are required.");
        }

        const character = await this.loadAuthoritativeCharacter(
          session.state.characterId
        );
        const updated = await this.sessionRepo.update(
          session.id,
          {
            state: {
              ...session.state,
              concept,
              ambition,
              lastActionBanner: `✏️ Updated biography traits (**Concept** & **Ambition**).`,
            },
          },
          CharacterSessionStateDataSchema
        );

        return renderEngine.build(CharacterEditorHomeRecipe, {
          sessionId: updated.id,
          character,
          concept: updated.state.concept,
          ambition: updated.state.ambition,
          bannerText: updated.state.lastActionBanner,
        });
      }

      // ----------------------------------------------------------------------
      // Tracker Adjustments & Quick Actions
      // ----------------------------------------------------------------------
      case CharacterControl.DecreaseHunger:
      case CharacterControl.IncreaseHunger:
      case CharacterControl.DecreaseWillpower:
      case CharacterControl.IncreaseWillpower:
      case CharacterControl.DecreaseRage:
      case CharacterControl.IncreaseRage:
      case CharacterControl.ShiftCrinos:
      case CharacterControl.ShiftHomid:
      case CharacterControl.SpendBlood:
      case CharacterControl.SlakeBlood:
      case CharacterControl.SpendWillpower:
      case CharacterControl.RestoreWillpower:
      case CharacterControl.QuickActionMenu: {
        return this.handleTrackerAction(
          session.id,
          session.state,
          control,
          interaction.isStringSelectMenu() ? interaction.values[0] : undefined
        );
      }

      default:
        throw new RealmError("Unknown character interaction control", {
          fields: { control: control ?? "undefined" },
        });
    }
  }

  /**
   * Loads an authoritative character from `CharacterRepository` or throws UserError.
   */
  private async loadAuthoritativeCharacter(
    characterId?: Snowflake
  ): Promise<CharacterData> {
    if (!characterId) {
      throw new UserError(
        "Character session lost or invalid. Please re-run /character."
      );
    }
    const found = await this.characterRepo.findById(characterId);
    if (!found) {
      throw new UserError("Character not found in database.");
    }
    return found;
  }

  /**
   * Applies domain entity mutations for tracker buttons and quick actions,
   * persists to `CharacterRepository`, and returns the updated `CharacterEditorHomeRecipe`.
   */
  private async handleTrackerAction(
    sessionId: Snowflake,
    sessionState: CharacterSessionStateData,
    control: string,
    selectValue?: string
  ): Promise<NormalizedRenderEnvelope> {
    const characterData = await this.loadAuthoritativeCharacter(
      sessionState.characterId
    );
    const entity = CharacterFactory.create(characterData);
    let bannerText = "Updated character tracker.";

    switch (control) {
      // Vampire 5th: Hunger
      case CharacterControl.IncreaseHunger:
        if (entity instanceof Vampire5th) {
          const next = entity.increaseHunger(1);
          bannerText = `🩸 Adjusted **Hunger** to **${next}/5**.`;
        }
        break;

      case CharacterControl.DecreaseHunger:
        if (entity instanceof Vampire5th) {
          const next = entity.decreaseHunger(1);
          bannerText = `🩸 Adjusted **Hunger** to **${next}/5**.`;
        }
        break;

      // Willpower adjustments
      case CharacterControl.IncreaseWillpower:
        if (entity instanceof Character5th) {
          entity.takeWillpowerDamage({ superficial: 1 });
          bannerText = `🧠 Adjusted **Superficial Willpower Damage** to **${entity.willpower.superficial}/${entity.willpower.total}**.`;
        } else if (entity instanceof Character20th) {
          entity.restoreWillpower(1);
          bannerText = `🧠 Restored **Willpower** to **${entity.willpower.current}/${entity.willpower.total}**.`;
        }
        break;

      case CharacterControl.DecreaseWillpower:
        if (entity instanceof Character5th) {
          entity.healWillpowerDamage({ superficial: 1 });
          bannerText = `🧠 Healed **Superficial Willpower Damage** to **${entity.willpower.superficial}/${entity.willpower.total}**.`;
        } else if (entity instanceof Character20th) {
          entity.spendWillpower(1);
          bannerText = `🧠 Spent **1 Willpower** (remaining: **${entity.willpower.current}/${entity.willpower.total}**).`;
        }
        break;

      // Werewolf 5th: Rage & Form
      case CharacterControl.IncreaseRage:
        if (entity instanceof Werewolf5th) {
          entity.increaseRage(1);
          bannerText = `🐺 Adjusted **Rage** to **${entity.rage}/5**.`;
        }
        break;

      case CharacterControl.DecreaseRage:
        if (entity instanceof Werewolf5th) {
          entity.decreaseRage(1);
          bannerText = `🐺 Adjusted **Rage** to **${entity.rage}/5**.`;
        }
        break;

      case CharacterControl.ShiftCrinos:
        if (entity instanceof Werewolf5th) {
          entity.setForm("Crinos");
          bannerText = `🐺 Shifted into **Crinos** war form! (*Health total +4*).`;
        }
        break;

      case CharacterControl.ShiftHomid:
        if (entity instanceof Werewolf5th) {
          entity.setForm("Homid");
          bannerText = `👤 Reverted to **Homid** form.`;
        }
        break;

      // Vampire 20th: Blood Pool
      case CharacterControl.SpendBlood:
        if (entity instanceof Vampire20th) {
          entity.spendBlood(1);
          bannerText = `🩸 Spent **1 Blood** (remaining: **${entity.bloodPool.current}/${entity.bloodPool.total}**).`;
        }
        break;

      case CharacterControl.SlakeBlood:
        if (entity instanceof Vampire20th) {
          entity.slakeBlood(1);
          bannerText = `🩸 Slaked blood (total: **${entity.bloodPool.current}/${entity.bloodPool.total}**).`;
        }
        break;

      // Quick Action dropdown
      case CharacterControl.QuickActionMenu: {
        const parsed = CharacterQuickActionSchema.safeParse(selectValue);
        if (!parsed.success) {
          throw new UserError("Invalid quick action selected.");
        }
        bannerText = this.applyQuickAction(entity, parsed.data);
        break;
      }
    }

    const updatedData = await this.characterRepo.update(entity.toData());

    const updatedSession = await this.sessionRepo.update(
      sessionId,
      {
        state: { ...sessionState, lastActionBanner: bannerText },
      },
      CharacterSessionStateDataSchema
    );

    return renderEngine.build(CharacterEditorHomeRecipe, {
      sessionId: updatedSession.id,
      character: updatedData,
      concept: updatedSession.state.concept,
      ambition: updatedSession.state.ambition,
      bannerText,
    });
  }

  /**
   * Applies quick action roll/mechanic to domain entity.
   */
  private applyQuickAction(entity: CharacterEntity, action: string): string {
    const die = Math.floor(Math.random() * 10) + 1;
    const isSuccess = die >= 6;

    if (action === CharacterQuickAction.RouseCheck) {
      if (entity instanceof Vampire5th) {
        if (!isSuccess) {
          entity.increaseHunger(1);
          return `🎲 **Rouse Check Failed!** Rolled **[${die}]** — Hunger increased to **${entity.hunger}/5**!`;
        }
        return `🎲 **Rouse Check Success!** Rolled **[${die}]** — Hunger remains at **${entity.hunger}/5**.`;
      }
    }

    if (action === CharacterQuickAction.MendSuperficial) {
      if (entity instanceof Character5th) {
        entity.healHealthDamage({ superficial: 1 });
        if (entity instanceof Vampire5th) {
          const rouseNote = isSuccess
            ? `Rouse Check succeeded (**[${die}]**)`
            : `Rouse Check failed (**[${die}]**, Hunger +1)`;
          if (!isSuccess) {
            entity.increaseHunger(1);
          }
          return `🩹 **Mended 1 Superficial Health!** ${rouseNote}.`;
        }
        return `🩹 **Mended 1 Superficial Health damage!**`;
      }
    }

    if (
      action === CharacterQuickAction.ShiftCrinos &&
      entity instanceof Werewolf5th
    ) {
      entity.setForm("Crinos");
      return `🐺 Shifted into **Crinos** war form! (*Health total +4*).`;
    }

    if (
      action === CharacterQuickAction.ShiftHomid &&
      entity instanceof Werewolf5th
    ) {
      entity.setForm("Homid");
      return `👤 Reverted to **Homid** form.`;
    }

    if (action === CharacterQuickAction.HealDamage) {
      if (entity instanceof Character20th) {
        entity.healHealthDamage({ bashing: 1 });
        return `🩹 Healed 1 damage box!`;
      }
    }

    return "Executed quick action.";
  }
}

/**
 * Exported singleton instance for automatic registration by the framework `Loader`.
 */
export const characterCoordinator = new CharacterCoordinator();
