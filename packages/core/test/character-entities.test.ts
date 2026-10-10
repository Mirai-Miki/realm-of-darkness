import { CharacterFactory, Vampire5th } from "../src";
import {
  CharacterStatus,
  CharacterDataSchema,
  RealmError,
  Splat,
  type Vampire5thData,
} from "@realm/common";

describe("Character Domain Entities", () => {
  const validSnowflakeId = "123456789012345678";
  const validUserId = "987654321098765432";

  const createMockV5Data = (
    overrides?: Partial<Vampire5thData>
  ): Vampire5thData => ({
    id: validSnowflakeId,
    userId: validUserId,
    chronicleId: null,
    name: "Elena Ross",
    splat: Splat.Vampire5th,
    status: CharacterStatus.Active,
    avatarUrl: null,
    themeColor: "#000000",
    createdAt: new Date(),
    lastUpdated: new Date(),
    hunger: 1,
    health: { total: 6, superficial: 0, aggravated: 0 },
    willpower: { total: 5, superficial: 0, aggravated: 0 },
    attributes: {
      strength: 2,
      dexterity: 3,
      stamina: 3,
      charisma: 2,
      manipulation: 2,
      composure: 3,
      intelligence: 3,
      wits: 2,
      resolve: 2,
    },
    skills: {
      athletics: { rating: 1, specialties: [] },
      brawl: { rating: 2, specialties: [] },
      craft: { rating: 0, specialties: [] },
      drive: { rating: 0, specialties: [] },
      firearms: { rating: 1, specialties: [] },
      melee: { rating: 2, specialties: [] },
      larceny: { rating: 0, specialties: [] },
      stealth: { rating: 2, specialties: [] },
      survival: { rating: 1, specialties: [] },
      animalKen: { rating: 0, specialties: [] },
      etiquette: { rating: 1, specialties: [] },
      insight: { rating: 2, specialties: [] },
      intimidation: { rating: 2, specialties: [] },
      leadership: { rating: 0, specialties: [] },
      performance: { rating: 0, specialties: [] },
      persuasion: { rating: 1, specialties: [] },
      streetwise: { rating: 1, specialties: [] },
      subterfuge: { rating: 2, specialties: [] },
      academics: { rating: 1, specialties: [] },
      awareness: { rating: 2, specialties: [] },
      finance: { rating: 0, specialties: [] },
      investigation: { rating: 1, specialties: [] },
      medicine: { rating: 0, specialties: [] },
      occult: { rating: 3, specialties: [] },
      politics: { rating: 0, specialties: [] },
      science: { rating: 0, specialties: [] },
      technology: { rating: 0, specialties: [] },
    },
    ...overrides,
  });

  describe("CharacterFactory", () => {
    it("should instantiate a Vampire5th entity when splat is vampire5th", () => {
      const data = createMockV5Data();
      const entity = CharacterFactory.create(data);

      expect(entity).toBeInstanceOf(Vampire5th);
      expect(entity.splat).toBe(Splat.Vampire5th);
      expect(entity.name).toBe("Elena Ross");
    });
  });

  describe("Vampire5th Entity Mechanics", () => {
    it("should manage hunger correctly", () => {
      const data = createMockV5Data({ hunger: 1 });
      const vampire = new Vampire5th(data);

      expect(vampire.hunger).toBe(1);

      vampire.increaseHunger(2);
      expect(vampire.hunger).toBe(3);

      // Hunger cannot exceed 5
      vampire.increaseHunger(5);
      expect(vampire.hunger).toBe(5);

      vampire.decreaseHunger(2);
      expect(vampire.hunger).toBe(3);

      vampire.setHunger(4);
      expect(vampire.hunger).toBe(4);
    });

    it("should throw RealmError on invalid hunger adjustments", () => {
      const data = createMockV5Data();
      const vampire = new Vampire5th(data);

      expect(() => vampire.increaseHunger(-1)).toThrow(RealmError);
      expect(() => vampire.decreaseHunger(-1)).toThrow(RealmError);
      expect(() => vampire.setHunger(6)).toThrow(RealmError);
    });

    it("should manage experience points correctly", () => {
      const data = createMockV5Data();
      const vampire = new Vampire5th(data);

      vampire.setExperienceTotal(10);
      vampire.setExperienceCurrent(10);

      expect(vampire.canAffordExperience(5)).toBe(true);
      expect(vampire.canAffordExperience(15)).toBe(false);

      vampire.spendExperience(4);
      expect(vampire.experience.current).toBe(6);
      expect(vampire.experience.total).toBe(10);

      // Throws if overspending
      expect(() => vampire.spendExperience(10)).toThrow(RealmError);

      vampire.awardExperience(5);
      expect(vampire.experience.current).toBe(11);
      expect(vampire.experience.total).toBe(15);
    });

    it("should serialize toData() that passes CharacterDataSchema validation", () => {
      const data = createMockV5Data();
      const vampire = new Vampire5th(data);

      vampire.increaseHunger(1);
      vampire.name = "Elena Voss";

      const serialized = vampire.toData();
      expect(serialized.name).toBe("Elena Voss");
      expect(serialized.hunger).toBe(2);

      // Verify that serialized data passes strict Zod validation
      const validation = CharacterDataSchema.safeParse(serialized);
      expect(validation.success).toBe(true);
    });
  });
});
