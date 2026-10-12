import { RealmError } from "@realm/common";
import { UserRepository } from "../src/user.repository";
import type { UserDb } from "@realm/database";

const mockSelectLimit = jest.fn();
const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn();
const mockSelect = jest.fn();

const mockInsertReturning = jest.fn();
const mockInsertOnConflictDoUpdate = jest.fn();
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
    users: {
      id: "users.id",
      discordId: "users.discordId",
      displayName: "users.displayName",
      avatarUrl: "users.avatarUrl",
      admin: "users.admin",
      createdAt: "users.createdAt",
      updatedAt: "users.updatedAt",
    },
    db: {
      select: (...args: unknown[]) => mockSelect(...args),
      insert: (...args: unknown[]) => mockInsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  };
});

describe("UserRepository", () => {
  const sampleUserDb: UserDb = {
    id: "111111111111111111",
    discordId: "222222222222222222",
    displayName: "Miki",
    avatarUrl: "https://cdn.discordapp.com/avatars/222/avatar.png",
    admin: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  const repository = new UserRepository();

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelect.mockReturnValue({
      from: mockSelectFrom,
    });
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
      onConflictDoUpdate: mockInsertOnConflictDoUpdate,
    });
    mockInsertOnConflictDoUpdate.mockReturnValue({
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

  describe("findById", () => {
    it("should return UserData when found", async () => {
      mockSelectLimit.mockResolvedValue([sampleUserDb]);

      const result = await repository.findById(sampleUserDb.id);

      expect(result).toEqual(sampleUserDb);
    });

    it("should return null when not found", async () => {
      mockSelectLimit.mockResolvedValue([]);

      const result = await repository.findById(sampleUserDb.id);

      expect(result).toBeNull();
    });

    it("should throw RealmError on invalid snowflake", async () => {
      await expect(repository.findById("invalid-id")).rejects.toThrow(
        RealmError
      );
    });
  });

  describe("findManyByIds", () => {
    it("should return empty array when ids list is empty", async () => {
      const result = await repository.findManyByIds([]);

      expect(result).toEqual([]);
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it("should return mapped users when found", async () => {
      mockSelectWhere.mockResolvedValue([sampleUserDb]);

      const result = await repository.findManyByIds([sampleUserDb.id]);

      expect(result).toEqual([sampleUserDb]);
    });

    it("should throw RealmError on invalid snowflake in list", async () => {
      await expect(repository.findManyByIds(["bad-id"])).rejects.toThrow(
        RealmError
      );
    });
  });

  describe("findByDiscordId", () => {
    it("should return UserData when found by Discord ID", async () => {
      mockSelectLimit.mockResolvedValue([sampleUserDb]);

      const result = await repository.findByDiscordId(sampleUserDb.discordId!);

      expect(result).toEqual(sampleUserDb);
    });

    it("should return null when not found by Discord ID", async () => {
      mockSelectLimit.mockResolvedValue([]);

      const result = await repository.findByDiscordId(sampleUserDb.discordId!);

      expect(result).toBeNull();
    });

    it("should throw RealmError on invalid Discord ID", async () => {
      await expect(repository.findByDiscordId("bad")).rejects.toThrow(
        RealmError
      );
    });
  });

  describe("create", () => {
    it("should insert and return newly created UserData", async () => {
      mockInsertReturning.mockResolvedValue([sampleUserDb]);

      const result = await repository.create({
        discordId: sampleUserDb.discordId,
        displayName: sampleUserDb.displayName,
        avatarUrl: sampleUserDb.avatarUrl,
        admin: false,
      });

      expect(result).toEqual(sampleUserDb);
      expect(mockInsert).toHaveBeenCalled();
    });

    it("should throw RealmError if insert fails", async () => {
      mockInsertReturning.mockRejectedValue(new Error("DB error"));

      await expect(
        repository.create({
          discordId: sampleUserDb.discordId,
          displayName: sampleUserDb.displayName,
        })
      ).rejects.toThrow(RealmError);
    });
  });

  describe("update", () => {
    it("should update user when fields have changed", async () => {
      const updatedRow: UserDb = {
        ...sampleUserDb,
        displayName: "New Name",
      };
      mockSelectLimit.mockResolvedValue([sampleUserDb]);
      mockUpdateReturning.mockResolvedValue([updatedRow]);

      const result = await repository.update({
        id: sampleUserDb.id,
        displayName: "New Name",
      });

      expect(result.displayName).toBe("New Name");
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should skip DB update when no fields have changed", async () => {
      mockSelectLimit.mockResolvedValue([sampleUserDb]);

      const result = await repository.update({
        id: sampleUserDb.id,
        displayName: sampleUserDb.displayName,
      });

      expect(result).toEqual(sampleUserDb);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should throw RealmError when user not found and ignoreNotFound is false", async () => {
      mockSelectLimit.mockResolvedValue([]);

      await expect(
        repository.update({ id: sampleUserDb.id, displayName: "New" })
      ).rejects.toThrow(RealmError);
    });

    it("should return null when user not found and ignoreNotFound is true", async () => {
      mockSelectLimit.mockResolvedValue([]);

      const result = await repository.update(
        { id: sampleUserDb.id, displayName: "New" },
        { ignoreNotFound: true }
      );

      expect(result).toBeNull();
    });
  });

  describe("upsert", () => {
    it("should update user if record exists", async () => {
      const updatedRow: UserDb = {
        ...sampleUserDb,
        displayName: "Upserted Name",
      };
      mockSelectLimit.mockResolvedValue([sampleUserDb]);
      mockUpdateReturning.mockResolvedValue([updatedRow]);

      const result = await repository.upsert({
        id: sampleUserDb.id,
        displayName: "Upserted Name",
      });

      expect(result.displayName).toBe("Upserted Name");
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should create user if record does not exist", async () => {
      mockSelectLimit.mockResolvedValue([]);
      mockInsertReturning.mockResolvedValue([sampleUserDb]);

      const result = await repository.upsert({
        id: sampleUserDb.id,
        discordId: sampleUserDb.discordId,
        displayName: sampleUserDb.displayName,
        avatarUrl: sampleUserDb.avatarUrl,
      });

      expect(result).toEqual(sampleUserDb);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe("upsertFromDiscordProfile", () => {
    it("should insert with onConflictDoUpdate and return UserData", async () => {
      mockInsertReturning.mockResolvedValue([sampleUserDb]);

      const result = await repository.upsertFromDiscordProfile({
        discordId: sampleUserDb.discordId!,
        displayName: sampleUserDb.displayName,
        avatarUrl: sampleUserDb.avatarUrl,
      });

      expect(result).toEqual(sampleUserDb);
      expect(mockInsertOnConflictDoUpdate).toHaveBeenCalled();
    });

    it("should throw RealmError on invalid Discord profile input", async () => {
      await expect(
        repository.upsertFromDiscordProfile({
          discordId: "bad-id",
          displayName: "Miki",
          avatarUrl: sampleUserDb.avatarUrl,
        })
      ).rejects.toThrow(RealmError);
    });
  });

  describe("delete, exists, and count", () => {
    it("should delete user by ID", async () => {
      await repository.delete(sampleUserDb.id);
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should return true when user exists and false when not", async () => {
      mockSelectLimit.mockResolvedValueOnce([{ id: sampleUserDb.id }]);
      expect(await repository.exists(sampleUserDb.id)).toBe(true);

      mockSelectLimit.mockResolvedValueOnce([]);
      expect(await repository.exists(sampleUserDb.id)).toBe(false);
    });

    it("should count total users", async () => {
      mockSelectFrom.mockResolvedValueOnce([{ count: "1" }, { count: "2" }]);

      const total = await repository.count();

      expect(total).toBe(2);
    });
  });
});
