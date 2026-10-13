import type { StorytellerDb } from "@realm/database";
import { RealmError } from "@realm/common";
import { StorytellerRepository } from "../src/storyteller.repository";

// Mocks for Drizzle database query chains
const mockSelectLimit = jest.fn();
const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn();
const mockSelect = jest.fn();

const mockInsertReturning = jest.fn();
const mockInsertValues = jest.fn();
const mockInsert = jest.fn();

const mockDeleteWhere = jest.fn();
const mockDelete = jest.fn();

jest.mock("@realm/database", () => ({
  storytellers: {
    id: "storytellers.id",
    userId: "storytellers.userId",
    chronicleId: "storytellers.chronicleId",
    provider: "storytellers.provider",
    createdAt: "storytellers.createdAt",
  },
  insertStorytellerSchema: {
    parse: (data: unknown) => data,
  },
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("StorytellerRepository (@realm/repositories)", () => {
  const userId = "111111111111111111";
  const chronicleId = "222222222222222222";
  const grantId = "333333333333333333";
  const provider = "discord_guild_123";
  const now = new Date("2026-01-01T00:00:00.000Z");

  const sampleDbRow: StorytellerDb = {
    id: grantId,
    userId,
    chronicleId,
    provider,
    createdAt: now,
  };

  let repo: StorytellerRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new StorytellerRepository();

    // Default select chain: select() -> from() -> where() -> limit()
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });

    // Default insert chain: insert() -> values() -> returning()
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });

    // Default delete chain: delete() -> where()
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
  });

  describe("grant", () => {
    it("should return existing grant if already present", async () => {
      mockSelectLimit.mockResolvedValueOnce([sampleDbRow]);

      const result = await repo.grant({
        userId,
        chronicleId,
        provider,
      });

      expect(result.id).toBe(grantId);
      expect(result.userId).toBe(userId);
      expect(result.chronicleId).toBe(chronicleId);
      expect(result.provider).toBe(provider);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("should insert and return new grant if not present", async () => {
      mockSelectLimit.mockResolvedValueOnce([]);
      mockInsertReturning.mockResolvedValueOnce([sampleDbRow]);

      const result = await repo.grant({
        userId,
        chronicleId,
        provider,
      });

      expect(result.id).toBe(grantId);
      expect(mockInsert).toHaveBeenCalled();
      expect(mockInsertReturning).toHaveBeenCalled();
    });

    it("should throw RealmError if database operation fails", async () => {
      mockSelectLimit.mockRejectedValueOnce(new Error("DB Connection Error"));

      await expect(
        repo.grant({
          userId,
          chronicleId,
          provider,
        })
      ).rejects.toThrow(RealmError);
    });
  });

  describe("revoke", () => {
    it("should delete specific provider grant from database", async () => {
      mockDeleteWhere.mockResolvedValueOnce(undefined);

      await expect(
        repo.revoke(chronicleId, userId, provider)
      ).resolves.toBeUndefined();

      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteWhere).toHaveBeenCalled();
    });

    it("should throw RealmError if deletion fails", async () => {
      mockDeleteWhere.mockRejectedValueOnce(new Error("Delete Failed"));

      await expect(repo.revoke(chronicleId, userId, provider)).rejects.toThrow(
        RealmError
      );
    });
  });

  describe("revokeAllForUser", () => {
    it("should delete all provider grants for user in chronicle", async () => {
      mockDeleteWhere.mockResolvedValueOnce(undefined);

      await expect(
        repo.revokeAllForUser(chronicleId, userId)
      ).resolves.toBeUndefined();

      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteWhere).toHaveBeenCalled();
    });
  });

  describe("check", () => {
    it("should return true when storyteller record exists", async () => {
      mockSelectLimit.mockResolvedValueOnce([{ id: grantId }]);

      const result = await repo.check(chronicleId, userId);
      expect(result).toBe(true);
    });

    it("should return false when no storyteller record exists", async () => {
      mockSelectLimit.mockResolvedValueOnce([]);

      const result = await repo.check(chronicleId, userId);
      expect(result).toBe(false);
    });
  });

  describe("getProviders", () => {
    it("should return array of provider names", async () => {
      mockSelectWhere.mockResolvedValueOnce([
        { provider: "provider_1" },
        { provider: "provider_2" },
      ]);

      const result = await repo.getProviders(chronicleId, userId);
      expect(result).toEqual(["provider_1", "provider_2"]);
    });
  });

  describe("findByChronicle", () => {
    it("should return all storyteller grants for a chronicle", async () => {
      mockSelectWhere.mockResolvedValueOnce([sampleDbRow]);

      const result = await repo.findByChronicle(chronicleId);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(grantId);
      expect(result[0]?.userId).toBe(userId);
    });
  });
});
