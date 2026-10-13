import type { SlashCommandBuilder } from "discord.js";
import type { NormalizedRenderEnvelope } from "../../ui";
import type {
  AutocompleteContext,
  CommandContext,
  InterfaceContext,
} from "../interaction-router/interaction-context";

/**
 * Base class for all interaction handlers.
 * This provides the foundation for command handlers and coordinators.
 */
export abstract class BaseInteractionHandler {
  /**
   * Unique identifier for this handler.
   * For commands and coordinators, this is the command name.
   */
  abstract readonly handlerId: string;
}

/**
 * Handler for Slash Commands.
 * Defines the command structure and execution logic.
 */
export abstract class CommandHandler extends BaseInteractionHandler {
  /**
   * The command definition (name, description, options).
   * Used for registering with Discord's API.
   */
  abstract readonly data: SlashCommandBuilder;

  /**
   * Get the handler ID from the command name.
   *
   * @returns The command name as the handler identifier
   */
  get handlerId(): string {
    return this.data.name;
  }

  /**
   * Execute the command and return a `NormalizedRenderEnvelope`
   * for `InteractionRouter` + `InteractionDispatcher` to deliver to Discord.
   *
   * @param ctx - The typed command context
   * @returns A normalized render envelope built by `RenderEngine`
   */
  abstract execute(ctx: CommandContext): Promise<NormalizedRenderEnvelope>;

  /**
   * Handle autocomplete interactions for the command.
   * Defaults to a no-op for commands without autocomplete options.
   *
   * @param _ctx - The typed autocomplete context
   */
  public autocomplete(_ctx: AutocompleteContext): Promise<void> {
    void _ctx;
    return Promise.resolve();
  }
}

/**
 * Unified Coordinator for context-sensitive Discord features.
 *
 * A `Coordinator` extends `CommandHandler` so it handles:
 * 1. The initial slash command (`execute(ctx: CommandContext)`)
 * 2. Optional slash command autocomplete (`autocomplete(ctx: AutocompleteContext)`)
 * 3. All stateful interactive component/modal interactions (`handleInterface(ctx: InterfaceContext)`)
 *    whose `customId` starts with `{handlerId}:{sessionId}`!
 *
 * Coordinators return `renderEngine.build(Recipe, props)` (`NormalizedRenderEnvelope`),
 * allowing `InteractionRouter` + `InteractionDispatcher` to serve as the single Discord API boundary.
 */
export abstract class Coordinator extends CommandHandler {
  /**
   * Handle interactive component (Button, Select Menu) or Modal submit interactions
   * routed to this coordinator via `{handlerId}:{sessionId}`.
   *
   * @param ctx - The typed interface context
   * @returns A normalized render envelope to be delivered by `InteractionDispatcher`
   */
  abstract handleInterface(
    ctx: InterfaceContext
  ): Promise<NormalizedRenderEnvelope>;
}
