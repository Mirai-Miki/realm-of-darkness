import { logger } from "@realm/logger";
import { UserRepository } from "@realm/repositories";
import { User } from "@realm/core";
import type { BaseInteraction } from "discord.js";
import type { IUserRepository } from "@realm/common";
import type { BaseInteractionContext } from "../interaction-context";

/**
 * Narrow an unknown value to a plain object record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Read a string property from a record if it exists and is a string.
 */
function getStringProp(
  obj: Record<string, unknown>,
  key: string
): string | null {
  const value = obj[key];
  return typeof value === "string" ? value : null;
}

/**
 * Check if an error or any nested `.cause` in its chain represents a
 * PostgreSQL unique constraint violation (`code === "23505"`).
 *
 * Because `UserRepository` wraps database errors in `RealmError` and Drizzle ORM
 * wraps `pg.DatabaseError` in `DrizzleQueryError`, the `code` property may sit
 * one or two levels deep in the `.cause` chain.
 */
export function isPostgresUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  let depth = 0;

  while (isRecord(current) && depth < 5) {
    if (getStringProp(current, "code") === "23505") {
      return true;
    }
    current = current.cause;
    depth += 1;
  }

  return false;
}

/**
 * Ensure the interacting Discord user has a corresponding RoD user record.
 *
 * The Discord app only tracks users who interact with it.
 * This function upserts the user using Discord profile data keyed by `discordId`.
 *
 * @param ctx - The Discord interaction context
 * @param userRepo - Optional injected UserRepository instance
 * @returns The hydrated RoD `User` domain entity
 * @throws {RealmError} If the database upsert fails
 *
 * @example
 * ```typescript
 * const actor = await ensureActor(ctx);
 * ```
 */
export async function ensureActor<TInteraction extends BaseInteraction>(
  ctx: BaseInteractionContext<TInteraction>,
  userRepo: IUserRepository = new UserRepository()
): Promise<User> {
  const discordUserId = ctx.interaction.user.id;
  try {
    const userData = await userRepo.upsertFromDiscordProfile({
      discordId: discordUserId,
      displayName: ctx.interaction.user.displayName,
      avatarUrl: ctx.interaction.user.displayAvatarURL(),
    });

    return new User(userData);
  } catch (error) {
    if (!isPostgresUniqueViolation(error)) throw error;

    // Extremely rare fallback: if a unique violation happened concurrently,
    // re-fetch the user by discordId.
    logger.debug("User was created concurrently; re-fetching", {
      fields: { discordUserId },
    });

    const racedUserData = await userRepo.findByDiscordId(discordUserId);
    if (!racedUserData) throw error;

    return new User(racedUserData);
  }
}

/**
 * Middleware that ensures `ctx.actor` exists on the interaction context.
 *
 * @param userRepo - Optional injected UserRepository instance
 * @returns Interaction middleware function
 *
 * @example
 * ```typescript
 * const middleware = ensureActorMiddleware();
 * ```
 */
export function ensureActorMiddleware<TInteraction extends BaseInteraction>(
  userRepo?: IUserRepository
): (
  ctx: BaseInteractionContext<TInteraction>,
  next: () => Promise<void>
) => Promise<void> {
  return async (ctx, next) => {
    if (!ctx.actor) {
      ctx.actor = await ensureActor(ctx, userRepo);
    }
    await next();
  };
}
