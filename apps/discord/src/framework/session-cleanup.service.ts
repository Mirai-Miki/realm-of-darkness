import { InteractionSessionRepository } from "@realm/repositories";
import { logger } from "@realm/logger";
import type { Client } from "discord.js";

/**
 * Default interval between expired interaction session sweeps (12 hours in milliseconds).
 */
export const DEFAULT_SESSION_SWEEP_INTERVAL_MS = 12 * 60 * 60 * 1000;

/**
 * Background service that periodically purges expired rows from PostgreSQL's
 * `interaction_sessions` table.
 *
 * When running in a sharded environment, this service is strictly guarded to
 * execute only on Shard 0 so multiple shards do not run duplicate cleanup queries.
 */
export class SessionCleanupService {
  private readonly sessionRepository: InteractionSessionRepository;
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * Create a new `SessionCleanupService`.
   *
   * @param sessionRepository - Repository used to delete expired interaction sessions
   */
  public constructor(
    sessionRepository: InteractionSessionRepository = new InteractionSessionRepository()
  ) {
    this.sessionRepository = sessionRepository;
  }

  /**
   * Determine whether the provided Discord client is responsible for cluster-wide
   * maintenance tasks (unsharded or Shard 0).
   *
   * @param client - The active Discord.js client instance
   * @returns `true` if unsharded or if this process hosts Shard 0
   */
  public isPrimaryShard(client: Pick<Client, "shard">): boolean {
    if (!client.shard) {
      return true;
    }

    return client.shard.ids.includes(0);
  }

  /**
   * Execute a single sweep of expired `interaction_sessions` rows in PostgreSQL.
   *
   * Catches and logs any database errors internally so background timers never
   * cause unhandled promise rejections.
   *
   * @param now - Optional cutoff timestamp (defaults to `new Date()`)
   * @returns Number of expired session rows removed
   */
  public async sweep(now: Date = new Date()): Promise<number> {
    try {
      const deletedCount = await this.sessionRepository.deleteExpired(now);

      if (deletedCount > 0) {
        logger.info("Purged expired Discord interaction sessions", {
          fields: { deletedCount: deletedCount.toString() },
        });
      } else {
        logger.debug("Completed interaction session sweep (0 expired rows)");
      }

      return deletedCount;
    } catch (error) {
      logger.exception(
        "Failed to sweep expired Discord interaction sessions",
        error
      );
      return 0;
    }
  }

  /**
   * Start the periodic session cleanup schedule on Shard 0.
   *
   * Runs an immediate sweep and schedules recurring sweeps every `intervalMs`
   * (defaulting to 12 hours). The timer is `.unref()`ed so it never blocks
   * graceful process shutdown.
   *
   * @param client - The active Discord.js client
   * @param intervalMs - Sweep interval in milliseconds (defaults to 12 hours)
   * @returns `true` if the sweeper was started on this shard, `false` if skipped
   */
  public start(
    client: Pick<Client, "shard">,
    intervalMs: number = DEFAULT_SESSION_SWEEP_INTERVAL_MS
  ): boolean {
    if (!this.isPrimaryShard(client)) {
      logger.debug(
        "Skipping interaction session cleanup scheduler on non-primary shard",
        {
          fields: {
            shardIds: client.shard ? client.shard.ids.join(", ") : "none",
          },
        }
      );
      return false;
    }

    // Clear any existing timer to guarantee idempotency on reconnects
    this.stop();

    // Run an initial sweep in the background without blocking startup
    void this.sweep();

    this.timer = setInterval(() => {
      void this.sweep();
    }, intervalMs);

    // Ensure the background interval does not prevent Node.js from exiting cleanly
    this.timer.unref();

    logger.info("Started periodic interaction session cleanup scheduler", {
      fields: {
        intervalHours: (intervalMs / (60 * 60 * 1000)).toString(),
      },
    });

    return true;
  }

  /**
   * Stop the periodic session cleanup timer if running.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Global singleton instance of `SessionCleanupService`.
 */
export const sessionCleanupService = new SessionCleanupService();
