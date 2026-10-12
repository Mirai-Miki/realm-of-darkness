import {
  DEFAULT_SESSION_SWEEP_INTERVAL_MS,
  SessionCleanupService,
} from "../src/framework";
import type { InteractionSessionRepository } from "@realm/repositories";
import type { Client } from "discord.js";

describe("SessionCleanupService (@realm/discord)", () => {
  it("should default the sweep interval to 12 hours", () => {
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    expect(DEFAULT_SESSION_SWEEP_INTERVAL_MS).toBe(twelveHoursMs);
  });

  it("should run sweep and start scheduler when unsharded or on Shard 0", async () => {
    let deleteExpiredCalls = 0;
    const mockRepo = {
      deleteExpired: async () => {
        deleteExpiredCalls += 1;
        return Promise.resolve(3);
      },
    } as unknown as InteractionSessionRepository;

    const service = new SessionCleanupService(mockRepo);

    const shardZeroClient = {
      shard: { ids: [0] },
    } as unknown as Pick<Client, "shard">;

    expect(service.isPrimaryShard(shardZeroClient)).toBe(true);

    const started = service.start(shardZeroClient, 60_000);
    expect(started).toBe(true);
    expect(deleteExpiredCalls).toBe(1);

    const manualCount = await service.sweep();
    expect(manualCount).toBe(3);
    expect(deleteExpiredCalls).toBe(2);

    service.stop();
  });

  it("should skip starting the scheduler on non-zero shards (e.g. Shard 1)", () => {
    let deleteExpiredCalls = 0;
    const mockRepo = {
      deleteExpired: async () => {
        deleteExpiredCalls += 1;
        return Promise.resolve(0);
      },
    } as unknown as InteractionSessionRepository;

    const service = new SessionCleanupService(mockRepo);

    const shardOneClient = {
      shard: { ids: [1] },
    } as unknown as Pick<Client, "shard">;

    expect(service.isPrimaryShard(shardOneClient)).toBe(false);

    const started = service.start(shardOneClient, 60_000);
    expect(started).toBe(false);
    expect(deleteExpiredCalls).toBe(0);
  });
});
