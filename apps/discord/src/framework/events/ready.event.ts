import type { Client } from "discord.js";

import { Events } from "discord.js";
import { logger } from "@realm/logger";
import { DiscordEvent, sessionCleanupService } from "framework";
import { GuildSyncAction } from "features/guild/guild-sync.action";
import { initializeEmojis } from "framework/emoji-manager";

/**
 * Discord ClientReady event handler.
 *
 * Executes once when the bot successfully connects to Discord.
 * Handles:
 * - Emoji initialization
 * - Syncing all guilds with database
 * - Starting the Shard 0 interaction session cleanup scheduler
 */
class ReadyEvent extends DiscordEvent<Events.ClientReady> {
  readonly eventName = Events.ClientReady as const;
  override readonly once = true;

  async execute(client: Client<true>): Promise<void> {
    if (!client.user) {
      logger.error("Client ready event fired but client.user is undefined");
      return;
    }

    logger.info(`Bot logged in as ${client.user.tag}`, {
      fields: {
        userId: client.user.id,
        username: client.user.username,
        guildCount: client.guilds.cache.size.toString(),
      },
    });

    try {
      // Initialize dynamic emoji management
      logger.info("Loading application emojis...");
      await initializeEmojis(client);
      logger.info("Application emojis loaded successfully");
    } catch (error) {
      logger.exception("Failed to load application emojis", error);
    }

    try {
      // Sync all guilds with database
      logger.info("Syncing guilds with database...");

      const guildSyncAction = new GuildSyncAction();
      const { syncedCount, failedCount } = await guildSyncAction.execute(
        client.guilds.cache
      );

      if (failedCount > 0) {
        logger.warn(
          `Guild sync completed with errors (${syncedCount} synced, ${failedCount} failed)`
        );
      } else {
        logger.info(`Successfully synced ${syncedCount} guilds with database`);
      }
    } catch (error) {
      logger.exception("Failed to sync guilds", error);
    }

    // Start the 12-hour expired session cleanup sweeper (guarded to Shard 0)
    sessionCleanupService.start(client);

    logger.info("Bot is ready and operational");
  }
}

export const readyEvent = new ReadyEvent();
