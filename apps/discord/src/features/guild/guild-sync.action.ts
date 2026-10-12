import { logger } from "@realm/logger";
import {
  DiscordGuildRepository,
  ChronicleMemberRepository,
  DiscordGuildChronicleRepository,
  UserRepository,
} from "@realm/repositories";
import { CreateGuildAction } from "./create-guild.action";
import type { Guild, Collection } from "discord.js";
import type {
  IChronicleMemberRepository,
  IDiscordGuildChronicleRepository,
  IDiscordGuildRepository,
  IUserRepository,
  UserData,
} from "@realm/common";

/**
 * Summary metrics returned by `GuildSyncAction.execute`.
 */
export interface GuildSyncResult {
  /** Number of guilds that were synchronized without errors. */
  readonly syncedCount: number;
  /** Number of guilds that encountered an error during synchronization. */
  readonly failedCount: number;
}

/**
 * Action to sync guild(s) and their members with the database.
 *
 * Coordinates between Discord data and the database repositories:
 * - Ensures untracked guilds are registered and linked to a default Chronicle.
 * - Refreshes `discord_guilds` metadata (`name`, `iconUrl`) for tracked guilds
 *   without overwriting decoupled `chronicles` records.
 * - Performs stale member cleanup for existing single-guild Chronicles.
 */
export class GuildSyncAction {
  /** Repository for Discord Guild configuration persistence. */
  private readonly guildRepository: IDiscordGuildRepository;
  /** Repository for Chronicle Member persistence. */
  private readonly memberRepository: IChronicleMemberRepository;
  /** Repository for User identity lookups. */
  private readonly userRepository: IUserRepository;
  /** Repository for Guild-to-Chronicle link lookups. */
  private readonly linkRepository: IDiscordGuildChronicleRepository;
  /** Action for creating/ensuring a guild and its default Chronicle. */
  private readonly createGuildAction: CreateGuildAction;

  /**
   * Creates a new `GuildSyncAction` instance.
   *
   * @param guildRepository - Optional injected DiscordGuild repository
   * @param memberRepository - Optional injected ChronicleMember repository
   * @param userRepository - Optional injected User repository
   * @param linkRepository - Optional injected DiscordGuildChronicle repository
   * @param createGuildAction - Optional injected CreateGuildAction
   *
   * @example
   * ```typescript
   * const guildSyncAction = new GuildSyncAction();
   * ```
   */
  constructor(
    guildRepository?: IDiscordGuildRepository,
    memberRepository?: IChronicleMemberRepository,
    userRepository?: IUserRepository,
    linkRepository?: IDiscordGuildChronicleRepository,
    createGuildAction?: CreateGuildAction
  ) {
    this.guildRepository = guildRepository ?? new DiscordGuildRepository();
    this.memberRepository = memberRepository ?? new ChronicleMemberRepository();
    this.userRepository = userRepository ?? new UserRepository();
    this.linkRepository =
      linkRepository ?? new DiscordGuildChronicleRepository();
    this.createGuildAction =
      createGuildAction ??
      new CreateGuildAction(this.guildRepository, this.linkRepository);
  }

  /**
   * Syncs a collection of guilds with the database.
   *
   * Ensures that missing guilds are registered with a default Chronicle, updates
   * `discord_guilds` metadata for existing guilds, and performs member cleanup
   * for existing tracked guilds.
   *
   * @param guildsToSync - Collection of Discord Guilds to sync
   * @returns Summary of synced and failed guild counts
   *
   * @example
   * ```typescript
   * const { syncedCount, failedCount } = await guildSyncAction.execute(client.guilds.cache);
   * ```
   */
  public async execute(
    guildsToSync: Collection<string, Guild>
  ): Promise<GuildSyncResult> {
    let syncedCount = 0;
    let failedCount = 0;

    // Sync each guild sequentially to avoid flooding the gateway or database pool on startup
    for (const [guildId, guild] of guildsToSync) {
      try {
        // When waitGuildTimeout is 0, a guild in cache may not have its payload populated yet
        if (guild.available === false || !guild.name) {
          logger.warn(
            `Skipping guild (${guildId}) during startup sync because it is not yet available`
          );
          continue;
        }

        logger.info(`Syncing guild: ${guild.name} (${guild.id})`);

        const isTracked = await this.guildRepository.exists(guild.id);
        if (!isTracked) {
          logger.info(
            `Guild ${guild.name} (${guild.id}) is not tracked. Creating it and its default Chronicle.`
          );
          await this.createGuildAction.execute(guild);
        } else {
          // Ensure discord_guilds metadata is up-to-date and at least one Chronicle is linked
          await this.createGuildAction.execute(guild);
          await this.cleanupMembers(guild);
        }

        syncedCount += 1;
      } catch (error) {
        failedCount += 1;
        logger.exception(
          `Failed to sync guild ${guild.name} (${guildId})`,
          error
        );
      }
    }

    return { syncedCount, failedCount };
  }

  /**
   * Cleans up members of a guild that are no longer present on Discord.
   *
   * @param guild - The Discord guild to perform member cleanup on
   */
  private async cleanupMembers(guild: Guild): Promise<void> {
    // Retrieve all chronicles linked to this guild
    const links = await this.linkRepository.findByDiscordId(guild.id);
    const chronicleIds = links.map((link) => link.chronicleId);

    for (const chronicleId of chronicleIds) {
      // Evaluate if chronicle is tied to multiple guilds
      const chronicleGuildLinks =
        await this.linkRepository.findByChronicleId(chronicleId);

      // If the chronicle is shared across multiple Discord guilds, a member leaving
      // one guild does not mean they left the Chronicle as a whole.
      if (chronicleGuildLinks.length > 1) {
        logger.info(
          `Skipping member cleanup for chronicle ${chronicleId} as it is linked to multiple guilds.`
        );
        continue;
      }

      // Fetch DB members for this chronicle
      const dbMemberUserIds =
        await this.memberRepository.findIdsByChronicle(chronicleId);

      if (dbMemberUserIds.length === 0) {
        continue;
      }

      // Map internal user IDs to DB UserData to get their Discord IDs
      const identities =
        await this.userRepository.findManyByIds(dbMemberUserIds);
      const validUsers = identities.filter(
        (u): u is UserData => u !== null && u.discordId !== null
      );

      if (validUsers.length === 0) {
        continue;
      }

      // Map discordId -> userId to easily identify who to delete later
      const discordToUser = new Map<string, string>();
      for (const user of validUsers) {
        discordToUser.set(user.discordId as string, user.id);
      }

      const discordIdsToFetch = Array.from(discordToUser.keys());
      const activeDiscordIds = new Set<string>();

      // Batch fetch members from Discord (max 100 per chunk per gateway limit)
      const CHUNK_SIZE = 100;
      for (let i = 0; i < discordIdsToFetch.length; i += CHUNK_SIZE) {
        const chunk = discordIdsToFetch.slice(i, i + CHUNK_SIZE);
        try {
          const fetchedMembers = await guild.members.fetch({ user: chunk });
          for (const id of fetchedMembers.keys()) {
            activeDiscordIds.add(id);
          }
        } catch (fetchError) {
          logger.exception(
            `Failed to fetch batch chunk for guild ${guild.name} (${guild.id})`,
            fetchError
          );
        }
      }

      // Identify and remove leavers
      for (const discordId of discordIdsToFetch) {
        if (!activeDiscordIds.has(discordId)) {
          const userId = discordToUser.get(discordId);
          if (userId) {
            await this.memberRepository
              .delete(chronicleId, userId)
              .catch((err: Error) =>
                logger.exception(
                  `Failed to delete past member ${userId} from chronicle ${chronicleId}`,
                  err
                )
              );
          }
        }
      }
    }
  }
}
