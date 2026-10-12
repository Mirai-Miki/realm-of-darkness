import fg from "fast-glob";
import path from "path";
import { pathToFileURL } from "url";
import { logger } from "@realm/logger";
import {
  BaseInteractionHandler,
  CommandHandler,
} from "./entities/interaction-handlers.entity";
import { DiscordEvent } from "./entities/discord-event.entity";
import { registry } from "./registry";
import type { Client } from "discord.js";

/**
 * Dynamic loader for interaction handlers and Discord events.
 * Scans the file system for handler and event files and registers them.
 */
export class Loader {
  /**
   * Core method to scan files and extract handler instances.
   * Does NOT register handlers - returns them for processing.
   *
   * @param rootDirectory - The root directory to scan
   * @param pattern - Glob pattern to match files
   * @returns Array of handler instances found
   */
  private async scanHandlerFiles(
    rootDirectory: string,
    pattern: string
  ): Promise<BaseInteractionHandler[]> {
    const files = await fg.glob(pattern, {
      cwd: rootDirectory,
      absolute: true,
      ignore: ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
    });

    const handlers: BaseInteractionHandler[] = [];

    // Process each file
    for (const filePath of files) {
      try {
        // Dynamic import - convert to file URL for Windows compatibility
        const fileUrl = pathToFileURL(filePath).href;
        const module = (await import(fileUrl)) as Record<string, unknown>;

        // Scan all exports
        for (const [, exportedItem] of Object.entries(module)) {
          // Check for handler instances
          if (exportedItem instanceof BaseInteractionHandler) {
            handlers.push(exportedItem);
          }
          // Support arrays of handlers
          else if (Array.isArray(exportedItem)) {
            for (const item of exportedItem) {
              if (item instanceof BaseInteractionHandler) {
                handlers.push(item);
              }
            }
          }
        }
      } catch (error) {
        // Only log errors if logger is available (runtime mode)
        if (logger) {
          logger.exception("Failed to load handler file", error, {
            fields: { filePath },
          });
        }
      }
    }

    return handlers;
  }

  /**
   * Load all coordinators from the features directory.
   * Scans for files matching `*.coordinator.ts` and registers
   * any exported handler/coordinator instances.
   *
   * @param rootDirectory - The root directory to scan
   */
  public async loadInteractionHandlers(rootDirectory: string): Promise<void> {
    const start = Date.now();

    logger.debug("Scanning for coordinators", { fields: { rootDirectory } });

    const handlers = await this.scanHandlerFiles(
      rootDirectory,
      "**/*.coordinator.ts"
    );

    logger.debug("Found coordinator files", {
      fields: { count: handlers.length.toString() },
    });

    // Register all coordinators
    for (const handler of handlers) {
      registry.registerInteractionHandler(handler);
    }

    const elapsed = Date.now() - start;
    const stats = registry.getStats();

    logger.debug("Coordinator loading complete", {
      fields: {
        elapsed: `${elapsed}ms`,
        handlers: stats.handlers.toString(),
      },
    });
  }

  /**
   * Load all Discord event handlers from the framework/events directory.
   * Scans for files matching the event pattern and registers
   * any exported event instances with the Discord client.
   *
   * @param rootDirectory - The root directory to scan
   * @param client - The Discord.js client to register events with
   */
  public async loadDiscordEvents(
    rootDirectory: string,
    client: Client
  ): Promise<void> {
    const start = Date.now();

    logger.debug("Scanning for Discord events", { fields: { rootDirectory } });

    // Pattern matches: src/**/something.event.ts
    // Note: We intentionally do not load .js files.
    const pattern = "**/*.event.ts";

    const files = await fg.glob(pattern, {
      cwd: rootDirectory,
      absolute: true,
      ignore: ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
    });

    logger.debug("Found event files", {
      fields: { count: files.length.toString() },
    });

    // Process each file
    for (const filePath of files) {
      try {
        const relativePath = path.relative(process.cwd(), filePath);
        logger.debug("Loading event file", { fields: { relativePath } });

        // Dynamic import - convert to file URL for Windows compatibility
        const fileUrl = pathToFileURL(filePath).href;
        const module = (await import(fileUrl)) as Record<string, unknown>;

        // Scan all exports
        for (const [, exportedItem] of Object.entries(module)) {
          // Check for event instances
          if (exportedItem instanceof DiscordEvent) {
            registry.registerDiscordEvent(exportedItem);
            exportedItem.register(client);
          }
          // Support arrays of events
          else if (Array.isArray(exportedItem)) {
            for (const item of exportedItem) {
              if (item instanceof DiscordEvent) {
                registry.registerDiscordEvent(item);
                item.register(client);
              }
            }
          }
        }
      } catch (error) {
        logger.exception("Failed to load event file", error, {
          fields: { filePath },
        });
      }
    }

    const elapsed = Date.now() - start;
    const stats = registry.getStats();

    logger.debug("Discord event loading complete", {
      fields: {
        elapsed: `${elapsed}ms`,
        discordEvents: stats.discordEvents.toString(),
      },
    });
  }

  /**
   * Scan and return all command handlers/coordinators without registering them.
   * Useful for deployment scripts that need to extract command data.
   *
   * @param rootDirectory - The root directory to scan
   * @returns Array of CommandHandler instances
   */
  public async scanCommandHandlers(
    rootDirectory: string
  ): Promise<CommandHandler[]> {
    const allHandlers = await this.scanHandlerFiles(
      rootDirectory,
      "**/*.coordinator.ts"
    );

    // Filter to only CommandHandler instances
    return allHandlers.filter(
      (handler): handler is CommandHandler => handler instanceof CommandHandler
    );
  }
}

/**
 * Global singleton instance of the Loader.
 * All parts of the application should use this instance.
 */
export const loader = new Loader();
