import { ChronicleMember, DiscordGuild } from "@realm/core";
import {
  ChronicleMemberRepository,
  ChronicleRepository,
  DiscordGuildChronicleRepository,
  DiscordGuildRepository,
} from "@realm/repositories";
import { CreateGuildAction } from "../../../features/guild";
import type { BaseInteraction } from "discord.js";
import type {
  IChronicleMemberRepository,
  IChronicleRepository,
  IDiscordGuildChronicleRepository,
  IDiscordGuildRepository,
} from "@realm/common";
import type { BaseInteractionContext } from "../interaction-context";

/**
 * Dependencies injectable into `ensureGuildContext` and `ensureGuildContextMiddleware`.
 */
export interface GuildContextDependencies {
  /** Repository for Discord Guild records. */
  readonly guildRepo?: IDiscordGuildRepository;
  /** Repository for Guild-to-Chronicle links. */
  readonly linkRepo?: IDiscordGuildChronicleRepository;
  /** Repository for Chronicle records. */
  readonly chronicleRepo?: IChronicleRepository;
  /** Repository for Chronicle Member records. */
  readonly memberRepo?: IChronicleMemberRepository;
}

/**
 * Extract member display metadata (nickname, avatar URL, and boost flag) from an interaction.
 */
function resolveInteractionMemberProfile(interaction: BaseInteraction): {
  nickname: string;
  avatarUrl: string;
  boosted: number;
} {
  const member = interaction.member;
  if (member && typeof member === "object") {
    const memberRecord = member as unknown as Record<string, unknown>;
    const nickname =
      typeof memberRecord.displayName === "string" &&
      memberRecord.displayName.length > 0
        ? memberRecord.displayName
        : typeof memberRecord.nick === "string" && memberRecord.nick.length > 0
          ? memberRecord.nick
          : interaction.user.displayName;

    const avatarUrl =
      typeof memberRecord.displayAvatarURL === "function"
        ? (memberRecord.displayAvatarURL as () => string)()
        : interaction.user.displayAvatarURL();

    const boosted = memberRecord.premiumSince ? 1 : 0;

    return { nickname, avatarUrl, boosted };
  }

  return {
    nickname: interaction.user.displayName,
    avatarUrl: interaction.user.displayAvatarURL(),
    boosted: 0,
  };
}

/**
 * Ensure the Discord Guild, its linked Chronicle(s), and the interacting actor's
 * `ChronicleMember` records are synchronized in the database when an interaction
 * occurs inside a guild.
 *
 * This guarantees that:
 * 1. Even if `waitGuildTimeout: 0` or startup sync has not finished yet, the guild
 *    and its default Chronicle exist in PostgreSQL before any handler runs.
 * 2. Users who were already in the Discord guild prior to their first interaction
 *    have their `chronicle_members` records created across all Chronicles linked to the guild.
 *
 * @param ctx - The Discord interaction context
 * @param deps - Optional injected repositories for testing
 *
 * @example
 * ```typescript
 * await ensureGuildContext(ctx);
 * ```
 */
export async function ensureGuildContext<TInteraction extends BaseInteraction>(
  ctx: BaseInteractionContext<TInteraction>,
  deps: GuildContextDependencies = {}
): Promise<void> {
  const guild = ctx.interaction.guild;
  if (!guild) {
    return;
  }

  const guildRepo = deps.guildRepo ?? new DiscordGuildRepository();
  const linkRepo = deps.linkRepo ?? new DiscordGuildChronicleRepository();
  const chronicleRepo = deps.chronicleRepo ?? new ChronicleRepository();
  const memberRepo = deps.memberRepo ?? new ChronicleMemberRepository();

  const createGuildAction = new CreateGuildAction(
    guildRepo,
    linkRepo,
    chronicleRepo
  );

  // Ensure the DiscordGuild and at least one linked Chronicle exist
  const { guildData, chronicleLinks } = await createGuildAction.execute(guild);

  ctx.guild = new DiscordGuild(guildData);
  ctx.chronicleIds = chronicleLinks.map((link) => link.chronicleId);

  // If the interacting user has been resolved, ensure their ChronicleMember rows exist
  if (ctx.actor && ctx.chronicleIds.length > 0) {
    const profile = resolveInteractionMemberProfile(ctx.interaction);
    const memberships: ChronicleMember[] = [];

    for (const chronicleId of ctx.chronicleIds) {
      const memberData = await memberRepo.upsert({
        chronicleId,
        userId: ctx.actor.id,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        boosted: profile.boosted,
      });
      memberships.push(new ChronicleMember(memberData));
    }

    ctx.memberships = memberships;
  }
}

/**
 * Middleware that ensures `ctx.guild`, `ctx.chronicleIds`, and `ctx.memberships`
 * are synchronized and hydrated when an interaction occurs inside a Discord guild.
 *
 * @param deps - Optional injected repositories for testing
 * @returns Interaction middleware function
 *
 * @example
 * ```typescript
 * const middleware = ensureGuildContextMiddleware();
 * ```
 */
export function ensureGuildContextMiddleware<
  TInteraction extends BaseInteraction,
>(
  deps?: GuildContextDependencies
): (
  ctx: BaseInteractionContext<TInteraction>,
  next: () => Promise<void>
) => Promise<void> {
  return async (ctx, next) => {
    if (ctx.interaction.guild && !ctx.guild) {
      await ensureGuildContext(ctx, deps);
    }
    await next();
  };
}
