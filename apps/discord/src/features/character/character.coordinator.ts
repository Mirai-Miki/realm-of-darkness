import {
  CharacterNameSchema,
  SplatSchema,
  UserError,
  RealmError,
} from "@realm/common";
import { InteractionSessionRepository } from "@realm/repositories";
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
  CharacterWorkflowStep,
} from "./character-session.definitions";
import {
  CHARACTER_HANDLER_ID,
  CharacterCancelledRecipe,
  CharacterEditorHomeRecipe,
  ConfirmCreateCharacterRecipe,
  EditCharacterBioModalRecipe,
  SelectClanRecipe,
  SelectSplatRecipe,
} from "./character.recipes";
import { mockCharacterService } from "./mock-character.service";
import type {
  AutocompleteContext,
  CommandContext,
  InterfaceContext,
} from "../../framework";
import type { Snowflake } from "@realm/common";
import type { NormalizedRenderEnvelope } from "../../ui";
import type { CharacterSessionStateData } from "./character-session.definitions";
import type { MockCharacterService } from "./mock-character.service";

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
 * 3. **Pure Render Engine Return Flow**: Returns `renderEngine.build(Recipe, props)`
 *    without performing any direct Discord `reply`, `editReply`, or `showModal` API calls.
 */
export class CharacterCoordinator extends Coordinator {
  /**
   * Command definition loaded directly from the MDX documentation SSOT.
   */
  public readonly data = buildSlashCommandFromMdx(CHARACTER_HANDLER_ID);

  private readonly sessionRepo: InteractionSessionRepository;
  private readonly characterService: MockCharacterService;

  /**
   * Creates a new `CharacterCoordinator` instance.
   *
   * @param sessionRepo - Repository for PostgreSQL interaction session persistence
   * @param characterService - Service managing character records
   */
  constructor(
    sessionRepo?: InteractionSessionRepository,
    characterService?: MockCharacterService
  ) {
    super();
    this.sessionRepo = sessionRepo ?? new InteractionSessionRepository();
    this.characterService = characterService ?? mockCharacterService;
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
   *
   * @example
   * ```typescript
   * const envelope = await characterCoordinator.execute(ctx);
   * ```
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
    const existingCharacter = this.characterService.findByName(
      userId,
      characterName
    );

    if (existingCharacter) {
      const session = await this.sessionRepo.create(
        {
          userId,
          handlerId: this.handlerId,
          step: CharacterWorkflowStep.EditorHome,
          state: existingCharacter,
        },
        CharacterSessionStateDataSchema
      );

      logger.info("Opened existing character in interactive editor", {
        fields: {
          userId,
          characterName: existingCharacter.characterName,
          sessionId: session.id,
        },
      });

      return renderEngine.build(CharacterEditorHomeRecipe, {
        sessionId: session.id,
        state: session.state,
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
   *
   * @example
   * ```typescript
   * await characterCoordinator.autocomplete(ctx);
   * ```
   */
  public async autocomplete(ctx: AutocompleteContext): Promise<void> {
    const { interaction } = ctx;
    const focused = interaction.options.getFocused().toLowerCase();
    const userId = this.resolveActorId(ctx);

    const characters = this.characterService.findByUser(userId);
    const matches = characters
      .filter((c) => c.characterName.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((c) => ({
        name: `${c.characterName} (${c.clan ?? "Unknown"})`,
        value: c.characterName,
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
   *
   * @example
   * ```typescript
   * const envelope = await characterCoordinator.handleInterface(ctx);
   * ```
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

    // Check if the user selected "Open Bio Modal" from the quick action dropdown
    if (
      control === CharacterControl.QuickActionMenu &&
      interaction.isStringSelectMenu() &&
      interaction.values[0] === CharacterQuickAction.OpenBioModal
    ) {
      return renderEngine.build(EditCharacterBioModalRecipe, {
        sessionId: session.id,
        state: session.state,
      });
    }

    switch (control) {
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

        const nextState: CharacterSessionStateData = {
          ...session.state,
          splat: parsedSplat.data,
        };

        const updated = await this.sessionRepo.update(
          session.id,
          {
            step: CharacterWorkflowStep.SelectClan,
            state: nextState,
          },
          CharacterSessionStateDataSchema
        );

        return renderEngine.build(SelectClanRecipe, {
          sessionId: updated.id,
          state: updated.state,
        });
      }

      case CharacterControl.SelectClanMenu: {
        if (!interaction.isStringSelectMenu()) {
          throw new RealmError("Expected StringSelectMenu for clan selection");
        }
        const selectedClan = interaction.values[0];
        if (!selectedClan) {
          throw new UserError("Please select a valid Clan.");
        }

        const completedState: CharacterSessionStateData = {
          ...session.state,
          clan: selectedClan,
          lastActionBanner: `✨ Created **${session.state.characterName}** (${selectedClan})! Use the controls below to manage your sheet.`,
        };

        return this.persistAndBuildEditorEnvelope(
          userId,
          session.id,
          completedState
        );
      }

      case CharacterControl.DecreaseHunger:
      case CharacterControl.IncreaseHunger: {
        const delta = control === CharacterControl.IncreaseHunger ? 1 : -1;
        const nextHunger = Math.max(
          0,
          Math.min(5, session.state.hunger + delta)
        );

        const nextState: CharacterSessionStateData = {
          ...session.state,
          hunger: nextHunger,
          lastActionBanner: `🩸 Adjusted **Hunger** to **${nextHunger}/5**.`,
        };

        return this.persistAndBuildEditorEnvelope(
          userId,
          session.id,
          nextState
        );
      }

      case CharacterControl.DecreaseWillpower:
      case CharacterControl.IncreaseWillpower: {
        const delta = control === CharacterControl.IncreaseWillpower ? 1 : -1;
        const nextWp = Math.max(
          0,
          Math.min(
            session.state.willpowerMax,
            session.state.willpowerSuperficial + delta
          )
        );

        const nextState: CharacterSessionStateData = {
          ...session.state,
          willpowerSuperficial: nextWp,
          lastActionBanner: `🧠 Adjusted **Superficial Willpower Damage** to **${nextWp}/${session.state.willpowerMax}**.`,
        };

        return this.persistAndBuildEditorEnvelope(
          userId,
          session.id,
          nextState
        );
      }

      case CharacterControl.QuickActionMenu: {
        if (!interaction.isStringSelectMenu()) {
          throw new RealmError("Expected StringSelectMenu for quick action");
        }
        const parsedAction = CharacterQuickActionSchema.safeParse(
          interaction.values[0]
        );
        if (!parsedAction.success) {
          throw new UserError("Invalid quick action selected.");
        }

        const nextState = this.applyQuickAction(
          session.state,
          parsedAction.data
        );
        return this.persistAndBuildEditorEnvelope(
          userId,
          session.id,
          nextState
        );
      }

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

        const nextState: CharacterSessionStateData = {
          ...session.state,
          concept,
          ambition,
          lastActionBanner: `✏️ Updated biography traits (**Concept** & **Ambition**).`,
        };

        return this.persistAndBuildEditorEnvelope(
          userId,
          session.id,
          nextState
        );
      }

      default:
        throw new RealmError("Unknown character interaction control", {
          fields: { control: control ?? "undefined" },
        });
    }
  }

  /**
   * Executes a quick action selected from the Editor Home dropdown (e.g., Rouse Check or Mend).
   */
  private applyQuickAction(
    state: CharacterSessionStateData,
    action: CharacterQuickAction
  ): CharacterSessionStateData {
    // Perform a 1d10 Rouse Check ( >= 6 succeeds )
    const die = Math.floor(Math.random() * 10) + 1;
    const isSuccess = die >= 6;

    if (action === CharacterQuickAction.RouseCheck) {
      const nextHunger = isSuccess
        ? state.hunger
        : Math.min(5, state.hunger + 1);
      const outcomeText = isSuccess
        ? `🎲 **Rouse Check Success!** Rolled **[${die}]** — Hunger remains at **${nextHunger}/5**.`
        : `🎲 **Rouse Check Failed!** Rolled **[${die}]** — Hunger increased to **${nextHunger}/5**!`;

      return {
        ...state,
        hunger: nextHunger,
        lastActionBanner: outcomeText,
      };
    }

    if (action === CharacterQuickAction.MendSuperficial) {
      if (state.healthSuperficial <= 0) {
        return {
          ...state,
          lastActionBanner: `🩹 **Mend Skipped:** ${state.characterName} has no Superficial Health damage to mend.`,
        };
      }

      const nextHunger = isSuccess
        ? state.hunger
        : Math.min(5, state.hunger + 1);
      const nextHealth = Math.max(0, state.healthSuperficial - 1);
      const rouseNote = isSuccess
        ? `Rouse Check succeeded (**[${die}]**)`
        : `Rouse Check failed (**[${die}]**, Hunger +1)`;

      return {
        ...state,
        hunger: nextHunger,
        healthSuperficial: nextHealth,
        lastActionBanner: `🩹 **Mended 1 Superficial Health!** ${rouseNote}.`,
      };
    }

    return state;
  }

  /**
   * Saves the updated character state to both the mock character store and the
   * PostgreSQL interaction session, then returns the pure `NormalizedRenderEnvelope`
   * for the Editor Home dashboard.
   */
  private async persistAndBuildEditorEnvelope(
    userId: Snowflake,
    sessionId: Snowflake,
    nextState: CharacterSessionStateData
  ): Promise<NormalizedRenderEnvelope> {
    this.characterService.save(userId, nextState);

    const updated = await this.sessionRepo.update(
      sessionId,
      {
        step: CharacterWorkflowStep.EditorHome,
        state: nextState,
      },
      CharacterSessionStateDataSchema
    );

    return renderEngine.build(CharacterEditorHomeRecipe, {
      sessionId: updated.id,
      state: updated.state,
    });
  }
}

/**
 * Exported singleton instance for automatic registration by the framework `Loader`.
 */
export const characterCoordinator = new CharacterCoordinator();
