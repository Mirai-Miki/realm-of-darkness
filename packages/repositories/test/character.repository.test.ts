import type { CharacterDb } from "@realm/database";
import type { Vampire5thData } from "@realm/common";

import { CharacterStatus, RealmError, Splat } from "@realm/common";
import {
  CharacterRepository,
  splitCharacterData,
  toCharacterData,
} from "../src/character.repository";

// Mocks for Drizzle database query chains
const mockSelectLimit = jest.fn();
const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn();
const mockSelect = jest.fn();

const mockInsertReturning = jest.fn();
const mockInsertValues = jest.fn();
const mockInsert = jest.fn();

const mockUpdateReturning = jest.fn();
const mockUpdateWhere = jest.fn();
const mockUpdateSet = jest.fn();
const mockUpdate = jest.fn();

const mockDeleteWhere = jest.fn();
const mockDelete = jest.fn();

jest.mock("@realm/database", () => ({
  characters: {
    id: "characters.id",
    userId: "characters.userId",
    chronicleId: "characters.chronicleId",
    name: "characters.name",
    splat: "characters.splat",
    status: "characters.status",
    avatarUrl: "characters.avatarUrl",
    themeColor: "characters.themeColor",
    data: "characters.data",
    createdAt: "characters.createdAt",
    lastUpdated: "characters.lastUpdated",
  },
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("CharacterRepository & Helper Functions", () => {
  const sampleVampireData: Vampire5thData = {
    id: "123456789012345678",
    userId: "987654321098765432",
    chronicleId: "555555555555555555",
    name: "Julian Cross",
    splat: Splat.Vampire5th,
    status: CharacterStatus.Active,
    avatarUrl: "https://example.com/julian.png",
    themeColor: "#880808",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    lastUpdated: new Date("2026-01-02T00:00:00.000Z"),
    hunger: 2,
    health: { total: 5, superficial: 1, aggravated: 0 },
    willpower: { total: 5, superficial: 0, aggravated: 0 },
    attributes: {
      strength: 2,
      dexterity: 3,
      stamina: 2,
      charisma: 4,
      manipulation: 2,
      composure: 3,
      intelligence: 2,
      wits: 3,
      resolve: 2,
    },
    skills: {
      athletics: { rating: 2, specialties: [] },
      brawl: { rating: 1, specialties: [] },
      craft: { rating: 0, specialties: [] },
      drive: { rating: 1, specialties: [] },
      firearms: { rating: 2, specialties: ["Pistols"] },
      melee: { rating: 0, specialties: [] },
      larceny: { rating: 0, specialties: [] },
      stealth: { rating: 3, specialties: [] },
      survival: { rating: 1, specialties: [] },
      animalKen: { rating: 0, specialties: [] },
      etiquette: { rating: 2, specialties: [] },
      insight: { rating: 3, specialties: [] },
      intimidation: { rating: 1, specialties: [] },
      leadership: { rating: 2, specialties: [] },
      performance: { rating: 0, specialties: [] },
      persuasion: { rating: 3, specialties: [] },
      streetwise: { rating: 2, specialties: [] },
      subterfuge: { rating: 2, specialties: [] },
      academics: { rating: 1, specialties: [] },
      awareness: { rating: 2, specialties: [] },
      finance: { rating: 1, specialties: [] },
      investigation: { rating: 2, specialties: [] },
      medicine: { rating: 0, specialties: [] },
      occult: { rating: 2, specialties: [] },
      politics: { rating: 1, specialties: [] },
      science: { rating: 0, specialties: [] },
      technology: { rating: 1, specialties: [] },
    },
  };

  const sampleCharacterDbRow: CharacterDb = {
    id: sampleVampireData.id,
    userId: sampleVampireData.userId,
    chronicleId: sampleVampireData.chronicleId,
    name: sampleVampireData.name,
    splat: sampleVampireData.splat,
    status: sampleVampireData.status,
    avatarUrl: sampleVampireData.avatarUrl,
    themeColor: sampleVampireData.themeColor,
    createdAt: sampleVampireData.createdAt,
    lastUpdated: sampleVampireData.lastUpdated,
    data: {
      hunger: sampleVampireData.hunger,
      health: sampleVampireData.health,
      willpower: sampleVampireData.willpower,
      attributes: sampleVampireData.attributes,
      skills: sampleVampireData.skills,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelectWhere.mockImplementation(() => {
      const promise = Promise.resolve([]) as any;
      promise.limit = mockSelectLimit;
      return promise;
    });
    mockSelectLimit.mockResolvedValue([]);

    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
    mockInsertReturning.mockResolvedValue([]);

    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
    mockUpdateReturning.mockResolvedValue([]);

    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue([]);
  });

  describe("splitCharacterData", () => {
    it("should separate relational columns from the polymorphic JSONB data", () => {
      const split = splitCharacterData(sampleVampireData);

      expect(split.id).toBe(sampleVampireData.id);
      expect(split.userId).toBe(sampleVampireData.userId);
      expect(split.chronicleId).toBe(sampleVampireData.chronicleId);
      expect(split.name).toBe(sampleVampireData.name);
      expect(split.splat).toBe(sampleVampireData.splat);
      expect(split.status).toBe(sampleVampireData.status);
      expect(split.avatarUrl).toBe(sampleVampireData.avatarUrl);
      expect(split.themeColor).toBe(sampleVampireData.themeColor);

      // JSONB data object contains character traits
      expect(split.data).toHaveProperty("hunger", 2);
      expect(split.data).toHaveProperty("attributes");
      expect(split.data).not.toHaveProperty("userId");
      expect(split.data).not.toHaveProperty("chronicleId");
    });

    it("should generate a fallback ID when input does not have an id", () => {
      const { id: _ignored, ...withoutId } = sampleVampireData;
      const split = splitCharacterData(withoutId, "999888777666555444");

      expect(split.id).toBe("999888777666555444");
    });
  });

  describe("toCharacterData", () => {
    it("should reconstruct and validate a complete CharacterData DTO from a database row", () => {
      const hydrated = toCharacterData(sampleCharacterDbRow);

      expect(hydrated.id).toBe(sampleVampireData.id);
      expect(hydrated.name).toBe("Julian Cross");
      expect(hydrated.splat).toBe(Splat.Vampire5th);
      expect((hydrated as Vampire5thData).hunger).toBe(2);
      expect((hydrated as Vampire5thData).health.total).toBe(5);
    });

    it("should throw a RealmError if stored JSONB fails schema validation", () => {
      const corruptedRow: CharacterDb = {
        ...sampleCharacterDbRow,
        data: {
          ...(sampleCharacterDbRow.data as Record<string, unknown>),
          // Violate hunger constraint (must be between 0 and 5)
          hunger: 10,
        },
      };

      expect(() => toCharacterData(corruptedRow)).toThrow(RealmError);
    });
  });

  describe("CharacterRepository", () => {
    const repository = new CharacterRepository();

    describe("findById", () => {
      it("should return hydrated character data when record is found", async () => {
        mockSelectLimit.mockResolvedValue([sampleCharacterDbRow]);

        const result = await repository.findById(sampleVampireData.id);

        expect(result).not.toBeNull();
        expect(result?.id).toBe(sampleVampireData.id);
        expect(result?.name).toBe("Julian Cross");
      });

      it("should return null when record is not found", async () => {
        mockSelectLimit.mockResolvedValue([]);

        const result = await repository.findById("non-existent-id");

        expect(result).toBeNull();
      });
    });

    describe("findByUser", () => {
      it("should return all matching character records for a user", async () => {
        mockSelectWhere.mockResolvedValue([sampleCharacterDbRow]);

        const results = await repository.findByUser(sampleVampireData.userId);

        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Julian Cross");
      });
    });

    describe("findByChronicle", () => {
      it("should return all matching character records for a chronicle", async () => {
        mockSelectWhere.mockResolvedValue([sampleCharacterDbRow]);

        const results = await repository.findByChronicle(
          sampleVampireData.chronicleId!
        );

        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe("Julian Cross");
      });
    });

    describe("create", () => {
      it("should insert record and return validated character", async () => {
        mockInsertReturning.mockResolvedValue([sampleCharacterDbRow]);

        const result = await repository.create(sampleVampireData);

        expect(result.id).toBe(sampleVampireData.id);
        expect(mockInsert).toHaveBeenCalled();
        expect(mockInsertValues).toHaveBeenCalledWith(
          expect.objectContaining({
            id: sampleVampireData.id,
            name: "Julian Cross",
            splat: Splat.Vampire5th,
          })
        );
      });

      it("should throw RealmError if insert fails to return a row", async () => {
        mockInsertReturning.mockResolvedValue([]);

        await expect(repository.create(sampleVampireData)).rejects.toThrow(
          RealmError
        );
      });
    });

    describe("update", () => {
      it("should update record and return updated character", async () => {
        mockUpdateReturning.mockResolvedValue([sampleCharacterDbRow]);

        const result = await repository.update(sampleVampireData);

        expect(result.id).toBe(sampleVampireData.id);
        expect(mockUpdate).toHaveBeenCalled();
      });

      it("should throw RealmError if record not found and ignoreNotFound is false", async () => {
        mockUpdateReturning.mockResolvedValue([]);

        await expect(repository.update(sampleVampireData)).rejects.toThrow(
          RealmError
        );
      });

      it("should return null if record not found and ignoreNotFound is true", async () => {
        mockUpdateReturning.mockResolvedValue([]);

        const result = await repository.update(sampleVampireData, {
          ignoreNotFound: true,
        });

        expect(result).toBeNull();
      });
    });

    describe("upsert", () => {
      it("should update character if it already exists", async () => {
        mockSelectLimit.mockResolvedValue([{ id: sampleVampireData.id }]);
        mockUpdateReturning.mockResolvedValue([sampleCharacterDbRow]);

        const result = await repository.upsert(sampleVampireData);

        expect(result.id).toBe(sampleVampireData.id);
        expect(mockUpdate).toHaveBeenCalled();
      });

      it("should create character if it does not exist", async () => {
        mockSelectLimit.mockResolvedValue([]);
        mockInsertReturning.mockResolvedValue([sampleCharacterDbRow]);

        const result = await repository.upsert(sampleVampireData);

        expect(result.id).toBe(sampleVampireData.id);
        expect(mockInsert).toHaveBeenCalled();
      });
    });

    describe("delete", () => {
      it("should call delete on database", async () => {
        await repository.delete(sampleVampireData.id);

        expect(mockDelete).toHaveBeenCalled();
      });
    });

    describe("exists", () => {
      it("should return true when character exists", async () => {
        mockSelectLimit.mockResolvedValue([{ id: sampleVampireData.id }]);

        const exists = await repository.exists(sampleVampireData.id);

        expect(exists).toBe(true);
      });

      it("should return false when character does not exist", async () => {
        mockSelectLimit.mockResolvedValue([]);

        const exists = await repository.exists("unknown-id");

        expect(exists).toBe(false);
      });
    });
  });
});
