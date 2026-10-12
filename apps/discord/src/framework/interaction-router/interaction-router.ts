import { UserError } from "@realm/common";
import { logger } from "@realm/logger";
import { ErrorAlertRecipe, renderEngine } from "../../ui";
import {
  CommandHandler,
  Coordinator,
  InterfaceHandler,
} from "../entities/interaction-handlers.entity";
import { registry } from "../registry";
import { parseHandlerIdFromCustomId } from "./interaction-context";
import { interactionDispatcher } from "./interaction-dispatcher";
import { composeMiddleware } from "./interaction-middleware";
import { ensureActorMiddleware } from "./middlewares/ensure-actor.middleware";
import type {
  AutocompleteInteraction,
  BaseInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Interaction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import type {
  AutocompleteContext,
  BaseInteractionContext,
  CommandContext,
  ContextMenuContext,
  InterfaceContext,
} from "./interaction-context";

/**
 * Main router for handling Discord interactions.
 *
 * Routes interactions to the appropriate handler or coordinator based on type:
 * - Slash Commands → `CommandHandler` or `Coordinator`
 * - Buttons/Modals/Selects → `Coordinator.handleInterface` or `InterfaceHandler.execute`
 * - Autocomplete → `CommandHandler.autocomplete`
 *
 * When a Coordinator or Handler returns a `NormalizedRenderEnvelope` (built via the pure
 * `renderEngine.build()`), `InteractionRouter` hands it to `interactionDispatcher` to
 * execute the actual Discord API calls.
 *
 * Also acts as the centralized error handling boundary: all unhandled exceptions
 * bubble up to `route()`, which logs them via `logger.exception`, builds an
 * `ErrorAlertRecipe` envelope via `renderEngine.build()`, and dispatches it via
 * `interactionDispatcher`.
 */
export class InteractionRouter {
  private readonly runBaseMiddleware = composeMiddleware<
    BaseInteractionContext<BaseInteraction>
  >([ensureActorMiddleware<BaseInteraction>()]);

  /**
   * Route an interaction to the appropriate handler and catch any unhandled errors.
   *
   * @param interaction - The Discord interaction to route
   *
   * @example
   * ```typescript
   * await router.route(interaction);
   * ```
   */
  public async route(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction);
        return;
      }

      if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
        await this.handleInterface(interaction);
        return;
      }

      if (interaction.isAutocomplete()) {
        await this.handleAutocomplete(interaction);
        return;
      }

      if (interaction.isContextMenuCommand()) {
        await this.handleContextMenu(interaction);
        return;
      }

      logger.warn("Unknown interaction type", {
        fields: { type: interaction.type.toString() },
      });
    } catch (error) {
      await this.handleInteractionError(interaction, error);
    }
  }

  /**
   * Centralized bubble-up error handler for all Discord interactions.
   *
   * Unconditionally logs the exception via `logger.exception` (which automatically
   * downgrades `UserError`s with `log: false` to Debug level), builds the pure
   * `ErrorAlertRecipe` envelope via `renderEngine.build()`, and delivers it via
   * `interactionDispatcher.dispatch()`.
   */
  private async handleInteractionError(
    interaction: Interaction,
    error: unknown
  ): Promise<void> {
    logger.exception("Unhandled error during Discord interaction", error, {
      fields: {
        userId: interaction.user.id,
        interactionType: interaction.type.toString(),
      },
    });

    // Autocomplete interactions cannot receive standard message replies
    if (!interaction.isRepliable()) {
      return;
    }

    const isUserError = error instanceof UserError;
    const message = isUserError
      ? error.message
      : "❌ **An unexpected error occurred.** Please try again in a moment.";

    const errorEnvelope = renderEngine.build(ErrorAlertRecipe, {
      message,
      isUserError,
    });

    try {
      await interactionDispatcher.dispatch(interaction, errorEnvelope);
    } catch (replyError) {
      logger.debug("Failed to deliver error response to Discord interaction", {
        error: replyError,
      });
    }
  }

  private async handleCommand(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const handler = registry.getInteractionHandler(interaction.commandName);

    if (!handler) {
      logger.warn("No command handler found", {
        fields: { commandName: interaction.commandName },
      });
      return;
    }

    if (!(handler instanceof CommandHandler)) {
      logger.warn("Handler is not a CommandHandler", {
        fields: { commandName: interaction.commandName },
      });
      return;
    }

    logger.debug("Executing command", {
      fields: { commandName: interaction.commandName },
    });

    const ctx: CommandContext = {
      interaction,
    };

    await this.runBaseMiddleware(ctx, async () => {
      const envelope = await handler.execute(ctx);
      if (envelope) {
        await interactionDispatcher.dispatch(interaction, envelope);
      }
    });
  }

  private async handleInterface(
    interaction: MessageComponentInteraction | ModalSubmitInteraction
  ): Promise<void> {
    const handlerId = parseHandlerIdFromCustomId(interaction.customId);

    const handler = registry.getInteractionHandler(handlerId);

    if (!handler) {
      logger.warn("No interface handler found", {
        fields: { handlerId },
      });
      return;
    }

    const ctx: InterfaceContext = {
      interaction,
    };

    if (handler instanceof Coordinator) {
      logger.debug("Executing coordinator interface", {
        fields: { handlerId },
      });
      await this.runBaseMiddleware(ctx, async () => {
        const envelope = await handler.handleInterface(ctx);
        if (envelope) {
          await interactionDispatcher.dispatch(interaction, envelope);
        }
      });
      return;
    }

    if (handler instanceof InterfaceHandler) {
      logger.debug("Executing standalone interface handler", {
        fields: { handlerId },
      });
      await this.runBaseMiddleware(ctx, async () => {
        const envelope = await handler.execute(ctx);
        if (envelope) {
          await interactionDispatcher.dispatch(interaction, envelope);
        }
      });
      return;
    }

    logger.warn("Handler is neither a Coordinator nor an InterfaceHandler", {
      fields: { handlerId },
    });
  }

  private async handleAutocomplete(
    interaction: AutocompleteInteraction
  ): Promise<void> {
    const handler = registry.getInteractionHandler(interaction.commandName);

    if (!handler) {
      logger.warn("No autocomplete handler found", {
        fields: { commandName: interaction.commandName },
      });
      return;
    }

    if (!(handler instanceof CommandHandler) || !handler.autocomplete) {
      logger.warn("Handler does not support autocomplete", {
        fields: { commandName: interaction.commandName },
      });
      return;
    }

    logger.debug("Executing autocomplete", {
      fields: { commandName: interaction.commandName },
    });

    const ctx: AutocompleteContext = {
      interaction,
    };

    await this.runBaseMiddleware(
      ctx,
      async () => handler.autocomplete?.(ctx) ?? Promise.resolve()
    );
  }

  private async handleContextMenu(
    interaction: ContextMenuCommandInteraction
  ): Promise<void> {
    logger.debug("Context menu interaction received", {
      fields: { commandName: interaction.commandName },
    });

    const ctx: ContextMenuContext = {
      interaction,
    };

    await this.runBaseMiddleware(ctx, async () => Promise.resolve());

    return Promise.resolve();
  }
}
