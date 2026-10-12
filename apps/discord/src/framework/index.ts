/**
 * Framework Module
 *
 * This module provides the core infrastructure for the Discord bot.
 * It implements a Coordinator + Composable Render Engine architecture where:
 * - Command manifests are loaded from MDX documentation (SSOT)
 * - Coordinators handle commands, autocomplete, and stateless PostgreSQL session interactions
 * - Coordinators return pure `NormalizedRenderEnvelope`s built by `RenderEngine`
 * - `InteractionRouter` + `InteractionDispatcher` handle the single final Discord API handoff
 *
 * @module framework
 */

// Base Classes & Event System
export {
  BaseInteractionHandler,
  CommandHandler,
  Coordinator,
  InterfaceHandler,
  DiscordEvent,
  createEvent,
} from "./entities";

// Registry
export { Registry, registry } from "./registry";

// Router, Dispatcher, Context & Middleware
export {
  InteractionRouter,
  InteractionDispatcher,
  interactionDispatcher,
  parseHandlerIdFromCustomId,
  composeMiddleware,
  ensureActor,
  ensureActorMiddleware,
  ensureGuildContext,
  ensureGuildContextMiddleware,
  type GuildContextDependencies,
  type BaseInteractionContext,
  type CommandContext,
  type InterfaceContext,
  type AutocompleteContext,
  type ContextMenuContext,
  type InteractionMiddleware,
} from "./interaction-router";

// Command Builder (MDX SSOT -> SlashCommandBuilder)
export {
  buildSlashCommandFromManifest,
  buildSlashCommandFromMdx,
} from "./command-builder.util";

// Stateless Session Custom ID Protocol
export {
  encodeSessionCustomId,
  decodeSessionCustomId,
  type ParsedSessionCustomId,
} from "./session-custom-id.util";

// Loader
export { Loader, loader } from "./loader";
