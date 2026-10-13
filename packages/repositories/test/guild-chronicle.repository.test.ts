import { RealmError } from "@realm/common";
import { ChronicleMemberRepository } from "../src/chronicle-member.repository";
import { ChronicleRepository } from "../src/chronicle.repository";
import { DiscordGuildChronicleRepository } from "../src/discord-guild-chronicle.repository";
import { DiscordGuildRepository } from "../src/discord-guild.repository";
import type {
  ChronicleDb,
  ChronicleMemberDb,
  DiscordGuildChronicleDb,
  DiscordGuildDb,
} from "@realm/database";

const mockSelectLimit = jest.fn();
const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn();
const mockSelect = jest.fn();

const mockInsertReturning = jest.fn();
const mockInsertOnConflictDoNothing = jest.fn();
const mockInsertValues = jest.fn();
const mockInsert = jest.fn();

const mockUpdateReturning = jest.fn();
const mockUpdateWhere = jest.fn();
const mockUpdateSet = jest.fn();
const mockUpdate = jest.fn();

const mockDeleteWhere = jest.fn();
const mockDelete = jest.fn();

jest.mock("@realm/database", () => {
  const actual = jest.requireActual("@realm/database");
  return {
    ...actual,
    discordGuilds: {
      discordId: "discordGuilds.discordId",
      name: "discordGuilds.name",
      iconUrl: "discordGuilds.iconUrl",
      storytellerRoleIds: "discordGuilds.storytellerRoleIds",
      createdAt: "discordGuilds.createdAt",
      lastUpdated: "discordGuilds.lastUpdated",
    },
    chronicles: {
      id: "chronicles.id",
      name: "chronicles.name",
      iconUrl: "chronicles.iconUrl",
      createdAt: "chronicles.createdAt",
      lastUpdated: "chronicles.lastUpdated",
    },
    discordGuildChronicles: {
      discordId: "discordGuildChronicles.discordId",
      chronicleId: "discordGuildChronicles.chronicleId",
      createdAt: "discordGuildChronicles.createdAt",
      lastUpdated: "discordGuildChronicles.lastUpdated",
    },
    chronicleMembers: {
      chronicleId: "chronicleMembers.chronicleId",
      userId: "chronicleMembers.userId",
      boosted: "chronicleMembers.boosted",
      nickname: "chronicleMembers.nickname",
      avatarUrl: "chronicleMembers.avatarUrl",
      createdAt: "chronicleMembers.createdAt",
      lastUpdated: "chronicleMembers.lastUpdated",
    },
    db: {
      select: (...args: unknown[]) => mockSelect(...args),
      insert: (...args: unknown[]) => mockInsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  };
});

describe("Guild & Chronicle Repositories", () => {
  const guildId = "111111111111111111";
  const chronicleId = "222222222222222222";
  const userId = "333333333333333333";
  const now = new Date("2026-01-01T00:00:00.000Z");

  const sampleGuildRow: DiscordGuildDb = {
    discordId: guildId,
    name: "Realm Guild",
    iconUrl: "https://cdn.discordapp.com/icons/111/guild.png",
    storytellerRoleIds: [],
    createdAt: now,
    lastUpdated: now,
  };

  const sampleChronicleRow: ChronicleDb = {
    id: chronicleId,
    name: "Realm Chronicle",
    iconUrl: "https://cdn.discordapp.com/icons/111/guild.png",
    defaultVersion: "5th",
    storytellerRoleIds: [],
    createdAt: now,
    lastUpdated: now,
  };

  const sampleLinkRow: DiscordGuildChronicleDb = {
    discordId: guildId,
    chronicleId,
    createdAt: now,
    lastUpdated: now,
  };

  const sampleMemberRow: ChronicleMemberDb = {
    chronicleId,
    userId,
    boosted: 1,
    nickname: "Kindred",
    avatarUrl: "https://cdn.discordapp.com/avatars/333/user.png",
    createdAt: now,
    lastUpdated: now,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockImplementation(() => {
      const promise = Promise.resolve([]) as Promise<unknown[]> & {
        where: typeof mockSelectWhere;
      };
      promise.where = mockSelectWhere;
      return promise;
    });
    mockSelectWhere.mockImplementation(() => {
      const promise = Promise.resolve([]) as Promise<unknown[]> & {
        limit: typeof mockSelectLimit;
      };
      promise.limit = mockSelectLimit;
      return promise;
    });
    mockSelectLimit.mockResolvedValue([]);

    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockReturnValue({
      returning: mockInsertReturning,
      onConflictDoNothing: mockInsertOnConflictDoNothing,
    });
    mockInsertOnConflictDoNothing.mockReturnValue({
      returning: mockInsertReturning,
    });
    mockInsertReturning.mockResolvedValue([]);

    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
    mockUpdateReturning.mockResolvedValue([]);

    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue([]);
  });

  describe("DiscordGuildRepository", () => {
    const repo = new DiscordGuildRepository();

    it("should findById and return DiscordGuildData or null", async () => {
      mockSelectLimit.mockResolvedValueOnce([sampleGuildRow]);
      expect(await repo.findById(guildId)).toEqual(sampleGuildRow);

      mockSelectLimit.mockResolvedValueOnce([]);
      expect(await repo.findById(guildId)).toBeNull();
    });

    it("should create a new guild configuration", async () => {
      mockInsertReturning.mockResolvedValue([sampleGuildRow]);

      const created = await repo.create({
        discordId: guildId,
        name: "Realm Guild",
        iconUrl: sampleGuildRow.iconUrl,
      });

      expect(created).toEqual(sampleGuildRow);
      expect(mockInsert).toHaveBeenCalled();
    });

    it("should update guild when changed, or skip DB update when unchanged", async () => {
      // Unchanged case
      mockSelectLimit.mockResolvedValueOnce([sampleGuildRow]);
      const unchanged = await repo.update({
        discordId: guildId,
        name: sampleGuildRow.name,
      });
      expect(unchanged).toEqual(sampleGuildRow);
      expect(mockUpdate).not.toHaveBeenCalled();

      // Changed case
      const updatedRow = { ...sampleGuildRow, name: "Renamed Guild" };
      mockSelectLimit.mockResolvedValueOnce([sampleGuildRow]);
      mockUpdateReturning.mockResolvedValueOnce([updatedRow]);
      const updated = await repo.update({
        discordId: guildId,
        name: "Renamed Guild",
      });
      expect(updated.name).toBe("Renamed Guild");
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should handle not-found in update according to ignoreNotFound", async () => {
      mockSelectLimit.mockResolvedValue([]);

      await expect(
        repo.update({ discordId: guildId, name: "New" })
      ).rejects.toThrow(RealmError);

      const ignored = await repo.update(
        { discordId: guildId, name: "New" },
        { ignoreNotFound: true }
      );
      expect(ignored).toBeNull();
    });

    it("should upsert by creating when absent and updating when present", async () => {
      mockSelectLimit.mockResolvedValueOnce([]);
      mockInsertReturning.mockResolvedValueOnce([sampleGuildRow]);
      const inserted = await repo.upsert({
        discordId: guildId,
        name: sampleGuildRow.name,
      });
      expect(inserted).toEqual(sampleGuildRow);

      const updatedRow = { ...sampleGuildRow, name: "Upserted Guild" };
      mockSelectLimit.mockResolvedValueOnce([sampleGuildRow]);
      mockUpdateReturning.mockResolvedValueOnce([updatedRow]);
      const updated = await repo.upsert({
        discordId: guildId,
        name: "Upserted Guild",
      });
      expect(updated.name).toBe("Upserted Guild");
    });

    it("should check exists and delete guild", async () => {
      mockSelectLimit.mockResolvedValueOnce([{ discordId: guildId }]);
      expect(await repo.exists(guildId)).toBe(true);

      mockSelectLimit.mockResolvedValueOnce([]);
      expect(await repo.exists(guildId)).toBe(false);

      await repo.delete(guildId);
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe("ChronicleRepository", () => {
    const repo = new ChronicleRepository();

    it("should findById and findAllIds", async () => {
      mockSelectLimit.mockResolvedValueOnce([sampleChronicleRow]);
      expect(await repo.findById(chronicleId)).toEqual(sampleChronicleRow);

      mockSelectLimit.mockResolvedValueOnce([]);
      expect(await repo.findById(chronicleId)).toBeNull();

      mockSelectFrom.mockResolvedValueOnce([{ id: chronicleId }]);
      expect(await repo.findAllIds()).toEqual([chronicleId]);
    });

    it("should create, update, upsert, delete, and check exists", async () => {
      mockInsertReturning.mockResolvedValueOnce([sampleChronicleRow]);
      const created = await repo.create({
        name: "Realm Chronicle",
        iconUrl: sampleChronicleRow.iconUrl,
      });
      expect(created).toEqual(sampleChronicleRow);

      // Update unchanged
      mockSelectLimit.mockResolvedValueOnce([sampleChronicleRow]);
      const unchanged = await repo.update({
        id: chronicleId,
        name: sampleChronicleRow.name,
      });
      expect(unchanged).toEqual(sampleChronicleRow);

      // Update changed
      const updatedRow = { ...sampleChronicleRow, name: "Renamed Chronicle" };
      mockSelectLimit.mockResolvedValueOnce([sampleChronicleRow]);
      mockUpdateReturning.mockResolvedValueOnce([updatedRow]);
      const updated = await repo.update({
        id: chronicleId,
        name: "Renamed Chronicle",
      });
      expect(updated.name).toBe("Renamed Chronicle");

      // Upsert existing
      mockSelectLimit.mockResolvedValueOnce([sampleChronicleRow]);
      mockUpdateReturning.mockResolvedValueOnce([updatedRow]);
      const upsertedExisting = await repo.upsert({
        id: chronicleId,
        name: "Renamed Chronicle",
      });
      expect(upsertedExisting.name).toBe("Renamed Chronicle");

      // Upsert new
      mockSelectLimit.mockResolvedValueOnce([]);
      mockInsertReturning.mockResolvedValueOnce([sampleChronicleRow]);
      const upsertedNew = await repo.upsert({
        id: chronicleId,
        name: "Realm Chronicle",
      });
      expect(upsertedNew).toEqual(sampleChronicleRow);

      // Exists & delete
      mockSelectLimit.mockResolvedValueOnce([{ id: chronicleId }]);
      expect(await repo.exists(chronicleId)).toBe(true);

      await repo.delete(chronicleId);
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe("DiscordGuildChronicleRepository", () => {
    const repo = new DiscordGuildChronicleRepository();

    it("should link a guild and chronicle, handling onConflictDoNothing gracefully", async () => {
      // Fresh link
      mockInsertReturning.mockResolvedValueOnce([sampleLinkRow]);
      const created = await repo.link({ discordId: guildId, chronicleId });
      expect(created).toEqual(sampleLinkRow);

      // Existing link (onConflictDoNothing returns empty array, fallback select returns row)
      mockInsertReturning.mockResolvedValueOnce([]);
      mockSelectLimit.mockResolvedValueOnce([sampleLinkRow]);
      const existing = await repo.link({ discordId: guildId, chronicleId });
      expect(existing).toEqual(sampleLinkRow);
    });

    it("should findByDiscordId, findByChronicleId, and unlink", async () => {
      mockSelectWhere.mockResolvedValueOnce([sampleLinkRow]);
      expect(await repo.findByDiscordId(guildId)).toEqual([sampleLinkRow]);

      mockSelectWhere.mockResolvedValueOnce([sampleLinkRow]);
      expect(await repo.findByChronicleId(chronicleId)).toEqual([
        sampleLinkRow,
      ]);

      await repo.unlink({ discordId: guildId, chronicleId });
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe("ChronicleMemberRepository", () => {
    const repo = new ChronicleMemberRepository();

    it("should findByChronicleAndUser, findByChronicle, findIdsByChronicle, and findByUser", async () => {
      mockSelectLimit.mockResolvedValueOnce([sampleMemberRow]);
      const found = await repo.findByChronicleAndUser(chronicleId, userId);
      expect(found).toEqual({ ...sampleMemberRow, isStoryteller: false });

      mockSelectLimit.mockResolvedValueOnce([]);
      expect(await repo.findByChronicleAndUser(chronicleId, userId)).toBeNull();

      mockSelectWhere.mockResolvedValueOnce([sampleMemberRow]);
      expect(await repo.findByChronicle(chronicleId)).toHaveLength(1);

      mockSelectWhere.mockResolvedValueOnce([{ userId }]);
      expect(await repo.findIdsByChronicle(chronicleId)).toEqual([userId]);

      mockSelectWhere.mockResolvedValueOnce([sampleMemberRow]);
      expect(await repo.findByUser(userId)).toHaveLength(1);
    });

    it("should create, update, and upsert chronicle members", async () => {
      mockInsertReturning.mockResolvedValueOnce([sampleMemberRow]);
      const created = await repo.create({
        chronicleId,
        userId,
        nickname: "Kindred",
        avatarUrl: sampleMemberRow.avatarUrl,
        boosted: 1,
      });
      expect(created.nickname).toBe("Kindred");

      // Update unchanged
      mockSelectLimit.mockResolvedValueOnce([sampleMemberRow]);
      const unchanged = await repo.update({
        chronicleId,
        userId,
        nickname: "Kindred",
      });
      expect(unchanged.nickname).toBe("Kindred");

      // Update changed
      const updatedMember = { ...sampleMemberRow, nickname: "Elder" };
      mockSelectLimit.mockResolvedValueOnce([sampleMemberRow]);
      mockUpdateReturning.mockResolvedValueOnce([updatedMember]);
      const updated = await repo.update({
        chronicleId,
        userId,
        nickname: "Elder",
      });
      expect(updated.nickname).toBe("Elder");

      // Upsert existing
      mockSelectLimit.mockResolvedValueOnce([sampleMemberRow]);
      mockUpdateReturning.mockResolvedValueOnce([updatedMember]);
      const upsertedExisting = await repo.upsert({
        chronicleId,
        userId,
        nickname: "Elder",
      });
      expect(upsertedExisting.nickname).toBe("Elder");

      // Upsert new
      mockSelectLimit.mockResolvedValueOnce([]);
      mockInsertReturning.mockResolvedValueOnce([sampleMemberRow]);
      const upsertedNew = await repo.upsert({
        chronicleId,
        userId,
        nickname: "Kindred",
      });
      expect(upsertedNew.nickname).toBe("Kindred");
    });

    it("should support exists, counts, boosting queries, and deletes", async () => {
      mockSelectLimit.mockResolvedValueOnce([{ chronicleId }]);
      expect(await repo.exists(chronicleId, userId)).toBe(true);

      mockSelectWhere.mockResolvedValueOnce([sampleMemberRow]);
      expect(await repo.countByChronicle(chronicleId)).toBe(1);

      expect(await repo.findStorytellersByChronicle(chronicleId)).toEqual([]);

      mockSelectWhere.mockResolvedValueOnce([sampleMemberRow]);
      expect(await repo.findBoostingMembers(chronicleId)).toHaveLength(1);

      mockSelectWhere.mockResolvedValueOnce([{ total: "3" }]);
      expect(await repo.countTotalBoostsByUser(userId)).toBe(3);

      await repo.delete(chronicleId, userId);
      await repo.deleteByChronicle(chronicleId);
      expect(mockDelete).toHaveBeenCalledTimes(2);
    });
  });
});
