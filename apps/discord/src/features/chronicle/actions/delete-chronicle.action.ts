import {
  ChronicleRepository,
  DiscordGuildChronicleRepository,
  StorytellerRepository,
} from "@realm/repositories";
import { UserError } from "@realm/common";
import { logger } from "@realm/logger";
import { CreateChronicleAction } from "./create-chronicle.action";
import type {
  ChronicleData,
  IChronicleRepository,
  IDiscordGuildChronicleRepository,
  Snowflake,
} from "@realm/common";

/**
 * Parameters for deleting a chronicle from a Discord guild.
 */
export interface DeleteChronicleInput {
  /** Discord guild snowflake ID */
  readonly discordId: Snowflake;
  /** Chronicle snowflake ID to delete */
  readonly chronicleId: Snowflake;
  /** Fallback server display name used if auto-reconstitution is needed */
  readonly guildName: string;
  /** Fallback server icon URL */
  readonly guildIconUrl?: string;
  /** Acting user ID (receives Storyteller privilege if a new default chronicle is auto-created) */
  readonly userId: Snowflake;
}

/**
 * Result returned after deleting a chronicle.
 */
export interface DeleteChronicleResult {
  /** True if the last chronicle was deleted and a new default chronicle was automatically created */
  readonly reconstituted: boolean;
  /** The currently active chronicle following the deletion / reconstitution */
  readonly activeChronicle: ChronicleData;
}

/**
 * Action that handles deleting a chronicle linked to a Discord guild.
 *
 * Enforces the core invariant:
 * "There must always be at least one chronicle in a server so if the last is deleted
 * it should automatically make a new one."
 */
export class DeleteChronicleAction {
  private readonly chronicleRepo: IChronicleRepository;
  private readonly linkRepo: IDiscordGuildChronicleRepository;
  private readonly createChronicleAction: CreateChronicleAction;

  /**
   * Creates a new `DeleteChronicleAction` instance.
   *
   * @param chronicleRepo - Optional injected Chronicle repository
   * @param linkRepo - Optional injected DiscordGuildChronicle repository
   * @param createChronicleAction - Optional injected CreateChronicleAction
   */
  constructor(
    chronicleRepo?: IChronicleRepository,
    linkRepo?: IDiscordGuildChronicleRepository,
    createChronicleAction?: CreateChronicleAction
  ) {
    this.chronicleRepo = chronicleRepo ?? new ChronicleRepository();
    this.linkRepo = linkRepo ?? new DiscordGuildChronicleRepository();
    this.createChronicleAction =
      createChronicleAction ??
      new CreateChronicleAction(
        this.chronicleRepo,
        this.linkRepo,
        new StorytellerRepository()
      );
  }

  /**
   * Executes deletion of the specified chronicle.
   *
   * @param input - Deletion parameters
   * @returns Result indicating whether reconstitution occurred and the active chronicle
   * @throws {UserError} If the chronicle is not linked to the guild
   *
   * @example
   * ```typescript
   * const result = await deleteChronicleAction.execute({
   *   discordId: guild.id,
   *   chronicleId,
   *   guildName: guild.name,
   *   userId: user.id,
   * });
   * ```
   */
  public async execute(
    input: DeleteChronicleInput
  ): Promise<DeleteChronicleResult> {
    const existingLinks = await this.linkRepo.findByDiscordId(input.discordId);
    const linkExists = existingLinks.some(
      (l) => l.chronicleId === input.chronicleId
    );

    if (!linkExists) {
      throw new UserError(
        "The selected chronicle is not linked to this server."
      );
    }

    // 1. Unlink the chronicle from this guild
    await this.linkRepo.unlink({
      discordId: input.discordId,
      chronicleId: input.chronicleId,
    });

    // 2. If the chronicle is not linked to any other guild, delete it from storage
    const remainingGuilds = await this.linkRepo.findByChronicleId(
      input.chronicleId
    );
    if (remainingGuilds.length === 0) {
      await this.chronicleRepo.delete(input.chronicleId);
      logger.info("Purged unlinked chronicle from database", {
        fields: { chronicleId: input.chronicleId },
      });
    }

    // 3. Evaluate remaining chronicles linked to this guild
    const remainingLinks = await this.linkRepo.findByDiscordId(input.discordId);

    // INVARIANT ENFORCEMENT: Server must always have at least one chronicle!
    if (remainingLinks.length === 0) {
      logger.warn(
        "Last chronicle deleted for guild; automatically reconstituting default chronicle",
        {
          fields: {
            discordId: input.discordId,
            guildName: input.guildName,
          },
        }
      );

      const newChronicle = await this.createChronicleAction.execute({
        discordId: input.discordId,
        name: input.guildName,
        creatorUserId: input.userId,
        iconUrl: input.guildIconUrl,
      });

      return {
        reconstituted: true,
        activeChronicle: newChronicle,
      };
    }

    // Otherwise, transition active view to the first remaining chronicle
    const nextLink = remainingLinks[0];
    if (!nextLink) {
      throw new UserError("Failed to resolve remaining chronicle.");
    }
    const nextChronicle = await this.chronicleRepo.findById(
      nextLink.chronicleId
    );

    if (!nextChronicle) {
      throw new UserError("Failed to load active chronicle after deletion.");
    }

    return {
      reconstituted: false,
      activeChronicle: nextChronicle,
    };
  }
}
