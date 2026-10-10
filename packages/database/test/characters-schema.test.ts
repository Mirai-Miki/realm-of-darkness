import { Splat, CharacterStatus } from "@realm/common";
import {
  characters,
  insertCharacterSchema,
  selectCharacterSchema,
} from "../src/schema/characters/characters";

describe("Characters Database Schema", () => {
  const validSnowflakeId = "123456789012345678";
  const validUserId = "987654321098765432";
  const validChronicleId = "555555555555555555";

  describe("Table Definition", () => {
    it("should define characters table with correct column names", () => {
      expect(characters.id).toBeDefined();
      expect(characters.userId).toBeDefined();
      expect(characters.chronicleId).toBeDefined();
      expect(characters.name).toBeDefined();
      expect(characters.splat).toBeDefined();
      expect(characters.status).toBeDefined();
      expect(characters.avatarUrl).toBeDefined();
      expect(characters.themeColor).toBeDefined();
      expect(characters.data).toBeDefined();
      expect(characters.createdAt).toBeDefined();
      expect(characters.lastUpdated).toBeDefined();
    });
  });

  describe("insertCharacterSchema", () => {
    it("should validate a valid insertion payload", () => {
      const validInsert = {
        id: validSnowflakeId,
        userId: validUserId,
        chronicleId: validChronicleId,
        name: "Test Character",
        splat: Splat.Vampire5th,
        status: CharacterStatus.Active,
        avatarUrl: "https://example.com/avatar.png",
        themeColor: "#880808",
        data: { hunger: 1 },
      };

      const result = insertCharacterSchema.safeParse(validInsert);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test Character");
        expect(result.data.splat).toBe(Splat.Vampire5th);
      }
    });

    it("should reject invalid splat value", () => {
      const invalidInsert = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "Invalid Splat",
        splat: "invalid_splat" as any,
        status: CharacterStatus.Active,
        data: {},
      };

      const result = insertCharacterSchema.safeParse(invalidInsert);
      expect(result.success).toBe(false);
    });
  });

  describe("selectCharacterSchema", () => {
    it("should validate a row read from database", () => {
      const validRow = {
        id: validSnowflakeId,
        userId: validUserId,
        chronicleId: null,
        name: "Select Character",
        splat: Splat.Vampire5th,
        status: CharacterStatus.Active,
        avatarUrl: null,
        themeColor: "#000000",
        data: { hunger: 2 },
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      const result = selectCharacterSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });
  });
});
