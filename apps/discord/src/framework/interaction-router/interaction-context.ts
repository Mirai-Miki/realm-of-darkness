import type {
  AutocompleteInteraction,
  BaseInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import type { Snowflake } from "@realm/common";
import type {
  ChronicleMember,
  DiscordGuild,
  User as RodUser,
} from "@realm/core";

/**
 * Minimal interaction context passed into handlers.
 *
 * Keep this intentionally small:
 * - Raw interaction contains user/guild IDs when needed.
 * - Hydrated domain entities (`actor`, `guild`, `chronicleIds`, `memberships`)
 *   are attached by base router middlewares before handler execution.
 * - Longer-lived workflow state belongs in session storage, not on the per-dispatch context.
 */
export type BaseInteractionContext<TInteraction extends BaseInteraction> = {
  /** Raw Discord.js interaction. */
  interaction: TInteraction;

  /**
   * Hydrated RoD domain user entity, attached by `ensureActorMiddleware`.
   *
   * Do not pass raw `UserData` around inside the app.
   */
  actor?: RodUser;

  /**
   * Hydrated DiscordGuild domain entity when the interaction occurs in a guild,
   * attached by `ensureGuildContextMiddleware`.
   */
  guild?: DiscordGuild;

  /**
   * RoD Chronicle Snowflake IDs linked to `ctx.guild`, attached by `ensureGuildContextMiddleware`.
   */
  chronicleIds?: Snowflake[];

  /**
   * Hydrated ChronicleMember domain entities for `ctx.actor` across all Chronicles
   * linked to `ctx.guild`, attached by `ensureGuildContextMiddleware`.
   */
  memberships?: ChronicleMember[];
};

export type CommandContext =
  BaseInteractionContext<ChatInputCommandInteraction>;

export type InterfaceContext = BaseInteractionContext<
  MessageComponentInteraction | ModalSubmitInteraction
>;

export type AutocompleteContext =
  BaseInteractionContext<AutocompleteInteraction>;

export type ContextMenuContext =
  BaseInteractionContext<ContextMenuCommandInteraction>;

/**
 * Extract the handler ID from a component/modal custom ID.
 *
 * Current format: `handlerId:...` or just `handlerId`.
 *
 * @param customId - The Discord component or modal custom ID
 * @returns The extracted handler ID prefix
 *
 * @example
 * ```typescript
 * const handlerId = parseHandlerIdFromCustomId("character:123456789012345678:inc");
 * ```
 */
export function parseHandlerIdFromCustomId(customId: string): string {
  const [handlerId] = customId.split(":");
  return handlerId;
}
