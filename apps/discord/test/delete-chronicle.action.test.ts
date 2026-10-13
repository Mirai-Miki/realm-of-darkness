import { GameEdition, UserError } from "@realm/common";
import { CreateChronicleAction } from "../src/features/chronicle/actions/create-chronicle.action";
import { DeleteChronicleAction } from "../src/features/chronicle/actions/delete-chronicle.action";
import type {
  ChronicleData,
  DiscordGuildChronicleData,
  IChronicleRepository,
  IDiscordGuildChronicleRepository,
} from "@realm/common";

describe("DeleteChronicleAction", () => {
  const guildId = "111111111111111111";
  const chronicleId1 = "222222222222222222";
  const chronicleId2 = "333333333333333333";
  const userId = "444444444444444444";
  const now = new Date("2026-01-01T00:00:00.000Z");

  const chronicle2: ChronicleData = {
    id: chronicleId2,
    name: "Second Chronicle",
    iconUrl: "https://example.com/icon2.png",
    defaultVersion: GameEdition.Twentieth,
    storytellerRoleIds: [],
    createdAt: now,
    lastUpdated: now,
  };

  let mockChronicleRepo: jest.Mocked<IChronicleRepository>;
  let mockLinkRepo: jest.Mocked<IDiscordGuildChronicleRepository>;

  beforeEach(() => {
    mockChronicleRepo = {
      findById: jest.fn(),
      findManyByIds: jest.fn(),
      findAllIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    mockLinkRepo = {
      findByDiscordId: jest.fn(),
      findByChronicleId: jest.fn(),
      link: jest.fn(),
      unlink: jest.fn(),
    };
  });

  it("should throw UserError if the chronicle is not linked to the guild", async () => {
    mockLinkRepo.findByDiscordId.mockResolvedValue([]);

    const action = new DeleteChronicleAction(mockChronicleRepo, mockLinkRepo);

    await expect(
      action.execute({
        discordId: guildId,
        chronicleId: chronicleId1,
        guildName: "Elysium Server",
        userId,
      })
    ).rejects.toThrow(UserError);
  });

  it("should delete chronicle and switch to remaining chronicle when multiple exist", async () => {
    const link1: DiscordGuildChronicleData = {
      discordId: guildId,
      chronicleId: chronicleId1,
      createdAt: now,
      lastUpdated: now,
    };
    const link2: DiscordGuildChronicleData = {
      discordId: guildId,
      chronicleId: chronicleId2,
      createdAt: now,
      lastUpdated: now,
    };

    // Before unlink: 2 links. After unlink: 1 link (chronicle2).
    mockLinkRepo.findByDiscordId
      .mockResolvedValueOnce([link1, link2])
      .mockResolvedValueOnce([link2]);

    // Chronicle 1 is not linked to any other guild
    mockLinkRepo.findByChronicleId.mockResolvedValue([]);
    mockChronicleRepo.findById.mockResolvedValue(chronicle2);

    const action = new DeleteChronicleAction(mockChronicleRepo, mockLinkRepo);

    const result = await action.execute({
      discordId: guildId,
      chronicleId: chronicleId1,
      guildName: "Elysium Server",
      userId,
    });

    expect(mockLinkRepo.unlink).toHaveBeenCalledWith({
      discordId: guildId,
      chronicleId: chronicleId1,
    });
    expect(mockChronicleRepo.delete).toHaveBeenCalledWith(chronicleId1);
    expect(result.reconstituted).toBe(false);
    expect(result.activeChronicle.id).toBe(chronicleId2);
  });

  it("should not delete chronicle from storage if it remains linked to another guild", async () => {
    const link1: DiscordGuildChronicleData = {
      discordId: guildId,
      chronicleId: chronicleId1,
      createdAt: now,
      lastUpdated: now,
    };
    const link2: DiscordGuildChronicleData = {
      discordId: guildId,
      chronicleId: chronicleId2,
      createdAt: now,
      lastUpdated: now,
    };

    mockLinkRepo.findByDiscordId
      .mockResolvedValueOnce([link1, link2])
      .mockResolvedValueOnce([link2]);

    // Chronicle 1 still linked to another guild
    mockLinkRepo.findByChronicleId.mockResolvedValue([
      {
        discordId: "999999999999999999",
        chronicleId: chronicleId1,
        createdAt: now,
        lastUpdated: now,
      },
    ]);
    mockChronicleRepo.findById.mockResolvedValue(chronicle2);

    const action = new DeleteChronicleAction(mockChronicleRepo, mockLinkRepo);

    const result = await action.execute({
      discordId: guildId,
      chronicleId: chronicleId1,
      guildName: "Elysium Server",
      userId,
    });

    expect(mockLinkRepo.unlink).toHaveBeenCalledWith({
      discordId: guildId,
      chronicleId: chronicleId1,
    });
    // Should NOT delete from database because another guild is linked
    expect(mockChronicleRepo.delete).not.toHaveBeenCalled();
    expect(result.reconstituted).toBe(false);
    expect(result.activeChronicle.id).toBe(chronicleId2);
  });

  it("should auto-reconstitute a default chronicle if the last chronicle is deleted", async () => {
    const link1: DiscordGuildChronicleData = {
      discordId: guildId,
      chronicleId: chronicleId1,
      createdAt: now,
      lastUpdated: now,
    };

    // Before unlink: 1 link. After unlink: 0 links remaining!
    mockLinkRepo.findByDiscordId
      .mockResolvedValueOnce([link1])
      .mockResolvedValueOnce([]);

    mockLinkRepo.findByChronicleId.mockResolvedValue([]);

    const newReconstitutedChronicle: ChronicleData = {
      id: "444444444444444444",
      name: "Elysium Server",
      iconUrl: "https://cdn.discordapp.com/icons/111/icon.png",
      defaultVersion: GameEdition.Fifth,
      storytellerRoleIds: [],
      createdAt: now,
      lastUpdated: now,
    };

    const mockCreateChronicleAction = {
      execute: jest.fn().mockResolvedValue(newReconstitutedChronicle),
    };

    const action = new DeleteChronicleAction(
      mockChronicleRepo,
      mockLinkRepo,
      mockCreateChronicleAction as unknown as CreateChronicleAction
    );

    const result = await action.execute({
      discordId: guildId,
      chronicleId: chronicleId1,
      guildName: "Elysium Server",
      guildIconUrl: "https://cdn.discordapp.com/icons/111/icon.png",
      userId,
    });

    expect(mockLinkRepo.unlink).toHaveBeenCalledWith({
      discordId: guildId,
      chronicleId: chronicleId1,
    });
    expect(mockChronicleRepo.delete).toHaveBeenCalledWith(chronicleId1);
    expect(mockCreateChronicleAction.execute).toHaveBeenCalledWith({
      discordId: guildId,
      name: "Elysium Server",
      creatorUserId: userId,
      iconUrl: "https://cdn.discordapp.com/icons/111/icon.png",
    });
    expect(result.reconstituted).toBe(true);
    expect(result.activeChronicle.id).toBe("444444444444444444");
    expect(result.activeChronicle.name).toBe("Elysium Server");
  });
});
