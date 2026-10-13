import { PermissionsBitField } from "discord.js";
import { StorytellerRepository } from "@realm/repositories";
import { UserError } from "@realm/common";
import { logger } from "@realm/logger";
import type { Snowflake, IStorytellerRepository } from "@realm/common";
import type { BaseInteractionContext } from "../../../framework";
import type { BaseInteraction } from "discord.js";

/**
 * Options for verifying storyteller authorization.
 */
export interface CheckStorytellerPermissionOptions {
  /** Optional specific chronicle ID to check storyteller access for */
  chronicleId?: Snowflake;
  /** Role IDs assigned to the specific chronicle */
  chronicleStorytellerRoleIds?: Snowflake[];
}

/**
 * Action that validates whether an interacting user holds Storyteller status.
 *
 * Storyteller status is resolved through:
 * 1. Server-wide Storyteller roles configured in `guild.storytellerRoleIds`.
 * 2. Chronicle-specific Storyteller roles configured in `chronicle.storytellerRoleIds`.
 * 3. An explicit database grant in the `storytellers` table.
 * 4. Discord Server Administrators / Owners: When detected, their storyteller privilege
 *    is automatically synchronized into PostgreSQL so the web client recognizes them as well.
 */
export class CheckStorytellerPermissionAction {
  private readonly storytellerRepo: IStorytellerRepository;

  /**
   * Creates a new `CheckStorytellerPermissionAction` instance.
   *
   * @param storytellerRepo - Optional injected Storyteller repository
   */
  constructor(storytellerRepo?: IStorytellerRepository) {
    this.storytellerRepo = storytellerRepo ?? new StorytellerRepository();
  }

  /**
   * Evaluates if the interacting user is a Storyteller.
   * Throws `UserError` if unauthorized.
   *
   * @param ctx - The Discord interaction context
   * @param options - Optional chronicle context
   * @throws {UserError} If the user lacks Storyteller status
   *
   * @example
   * ```typescript
   * await checkStorytellerAction.execute(ctx, { chronicleId });
   * ```
   */
  public async execute<TInteraction extends BaseInteraction>(
    ctx: BaseInteractionContext<TInteraction>,
    options: CheckStorytellerPermissionOptions = {}
  ): Promise<boolean> {
    const isSt = await this.isStoryteller(ctx, options);

    if (!isSt) {
      throw new UserError(
        "You must be an authorized Storyteller to manage these settings.",
        {
          fields: {
            userId: ctx.actor?.id ?? ctx.interaction.user.id,
            guildId: ctx.guild?.discordId ?? "none",
          },
        }
      );
    }

    return true;
  }

  /**
   * Internal boolean evaluation of Storyteller privileges.
   */
  public async isStoryteller<TInteraction extends BaseInteraction>(
    ctx: BaseInteractionContext<TInteraction>,
    options: CheckStorytellerPermissionOptions = {}
  ): Promise<boolean> {
    const { interaction, actor, guild } = ctx;
    const member = interaction.member;

    if (!member || !guild) {
      return false;
    }

    // Extract member's Discord role IDs
    const memberRoleIds: string[] = Array.isArray(member.roles)
      ? member.roles
      : typeof (member.roles as { cache?: Map<string, unknown> }).cache
            ?.keys === "function"
        ? Array.from(
            (
              member.roles as {
                cache: { keys: () => IterableIterator<string> };
              }
            ).cache.keys()
          )
        : [];

    // 1. Check server-wide Storyteller roles on DiscordGuild
    const hasServerRole = guild.storytellerRoleIds.some((roleId) =>
      memberRoleIds.includes(roleId)
    );
    if (hasServerRole) {
      return true;
    }

    // 2. Check chronicle-specific Storyteller roles
    if (options.chronicleStorytellerRoleIds) {
      const hasChronicleRole = options.chronicleStorytellerRoleIds.some(
        (roleId) => memberRoleIds.includes(roleId)
      );
      if (hasChronicleRole) {
        return true;
      }
    }

    // 3. Check explicit database Storyteller record
    if (actor && options.chronicleId) {
      const isGrantedInDb = await this.storytellerRepo.check(
        options.chronicleId,
        actor.id
      );
      if (isGrantedInDb) {
        return true;
      }
    }

    // 4. Check if member is a Discord Administrator or Guild Owner
    const isDiscordAdmin = this.isDiscordAdmin(
      member,
      interaction.guild?.ownerId
    );
    if (isDiscordAdmin) {
      // If a Discord admin accesses a chronicle, synchronize their storyteller grant to DB
      if (actor && options.chronicleId) {
        try {
          await this.storytellerRepo.grant({
            userId: actor.id,
            chronicleId: options.chronicleId,
            provider: guild.discordId,
          });
        } catch (error) {
          logger.debug("Failed to auto-grant storyteller record to admin", {
            error,
          });
        }
      }
      return true;
    }

    return false;
  }

  /**
   * Check if a member has Administrator or ManageGuild permissions in Discord.
   */
  private isDiscordAdmin(member: unknown, ownerId?: string): boolean {
    if (!member || typeof member !== "object") {
      return false;
    }

    const memberRecord = member as Record<string, unknown>;

    // Guild Owner check
    const userObj = memberRecord.user as { id?: string } | undefined;
    if (userObj?.id && ownerId && userObj.id === ownerId) {
      return true;
    }

    // Permissions check
    const rawPermissions = memberRecord.permissions;
    if (rawPermissions !== undefined) {
      try {
        const perms =
          rawPermissions instanceof PermissionsBitField
            ? rawPermissions
            : typeof rawPermissions === "string" ||
                typeof rawPermissions === "number" ||
                typeof rawPermissions === "bigint"
              ? new PermissionsBitField(BigInt(rawPermissions))
              : null;

        if (perms) {
          return (
            perms.has(PermissionsBitField.Flags.Administrator) ||
            perms.has(PermissionsBitField.Flags.ManageGuild)
          );
        }
      } catch {
        return false;
      }
    }

    return false;
  }
}
