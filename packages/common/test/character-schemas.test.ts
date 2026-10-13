import {
  CharacterMetadataSchema,
  CharacterDataSchema,
  Vampire5thDataSchema,
  Vampire5thSheetSchema,
  CharacterStatus,
  Splat,
} from "../src";

describe("Character Schemas", () => {
  const validSnowflakeId = "123456789012345678";
  const validUserId = "987654321098765432";
  const validChronicleId = "555555555555555555";

  describe("CharacterMetadataSchema", () => {
    it("should validate a complete metadata record", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        chronicleId: validChronicleId,
        name: "Julian Voss",
        splat: Splat.Vampire5th,
        status: CharacterStatus.Active,
        avatarUrl: "https://example.com/avatar.png",
        themeColor: "#ff0000",
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      const result = CharacterMetadataSchema.parse(input);
      expect(result.id).toBe(validSnowflakeId);
      expect(result.name).toBe("Julian Voss");
      expect(result.status).toBe(CharacterStatus.Active);
    });

    it("should supply correct defaults for optional fields", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "Elena Ross",
        splat: Splat.Vampire5th,
      };

      const result = CharacterMetadataSchema.parse(input);
      expect(result.status).toBe(CharacterStatus.Draft);
      expect(result.chronicleId).toBeNull();
      expect(result.avatarUrl).toBeNull();
      expect(result.themeColor).toBe("#000000");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it("should reject names starting with system prefix '~'", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "~SystemCharacter",
        splat: Splat.Vampire5th,
      };

      expect(() => CharacterMetadataSchema.parse(input)).toThrow(
        /reserved for system use/
      );
    });

    it("should reject invalid Snowflake IDs", () => {
      const input = {
        id: "invalid-id",
        userId: validUserId,
        name: "Test Character",
        splat: Splat.Vampire5th,
      };

      expect(() => CharacterMetadataSchema.parse(input)).toThrow();
    });
  });

  describe("Vampire5thDataSchema", () => {
    const validV5Attributes = {
      strength: 2,
      dexterity: 3,
      stamina: 2,
      charisma: 4,
      manipulation: 2,
      composure: 3,
      intelligence: 2,
      wits: 3,
      resolve: 2,
    };

    const validV5Skills = {
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
    };

    it("should validate a complete Vampire 5th edition character", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "Marcus Cole",
        splat: Splat.Vampire5th,
        hunger: 2,
        health: { total: 5, superficial: 1, aggravated: 0 },
        willpower: { total: 5, superficial: 0, aggravated: 0 },
        attributes: validV5Attributes,
        skills: validV5Skills,
      };

      const result = Vampire5thDataSchema.parse(input);
      expect(result.splat).toBe(Splat.Vampire5th);
      expect(result.hunger).toBe(2);
      expect(result.health.total).toBe(5);
    });

    it("should validate Vampire5thSheetSchema for sheet-only data", () => {
      const sheet = {
        hunger: 3,
        health: { total: 6, superficial: 0, aggravated: 0 },
        willpower: { total: 5, superficial: 0, aggravated: 0 },
        attributes: validV5Attributes,
        skills: validV5Skills,
      };

      const result = Vampire5thSheetSchema.parse(sheet);
      expect(result.hunger).toBe(3);
      expect(result.health.total).toBe(6);
    });

    it("should reject hunger exceeding 5", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "Marcus Cole",
        splat: Splat.Vampire5th,
        hunger: 6,
        health: { total: 5, superficial: 0, aggravated: 0 },
        willpower: { total: 5, superficial: 0, aggravated: 0 },
        attributes: validV5Attributes,
        skills: validV5Skills,
      };

      expect(() => Vampire5thDataSchema.parse(input)).toThrow();
    });

    it("should reject damage exceeding total tracker boxes", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "Marcus Cole",
        splat: Splat.Vampire5th,
        hunger: 1,
        health: { total: 5, superficial: 4, aggravated: 2 }, // 4 + 2 = 6 > 5
        willpower: { total: 5, superficial: 0, aggravated: 0 },
        attributes: validV5Attributes,
        skills: validV5Skills,
      };

      expect(() => Vampire5thDataSchema.parse(input)).toThrow(
        /Damage cannot exceed total tracker boxes/
      );
    });
  });

  describe("CharacterDataSchema (Discriminated Union)", () => {
    it("should correctly discriminate and route Vampire5th payload", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "V5 Character",
        splat: Splat.Vampire5th,
        hunger: 1,
        health: { total: 5, superficial: 0, aggravated: 0 },
        willpower: { total: 5, superficial: 0, aggravated: 0 },
        attributes: {
          strength: 2,
          dexterity: 2,
          stamina: 2,
          charisma: 2,
          manipulation: 2,
          composure: 2,
          intelligence: 2,
          wits: 2,
          resolve: 2,
        },
        skills: {
          athletics: { rating: 0, specialties: [] },
          brawl: { rating: 0, specialties: [] },
          craft: { rating: 0, specialties: [] },
          drive: { rating: 0, specialties: [] },
          firearms: { rating: 0, specialties: [] },
          melee: { rating: 0, specialties: [] },
          larceny: { rating: 0, specialties: [] },
          stealth: { rating: 0, specialties: [] },
          survival: { rating: 0, specialties: [] },
          animalKen: { rating: 0, specialties: [] },
          etiquette: { rating: 0, specialties: [] },
          insight: { rating: 0, specialties: [] },
          intimidation: { rating: 0, specialties: [] },
          leadership: { rating: 0, specialties: [] },
          performance: { rating: 0, specialties: [] },
          persuasion: { rating: 0, specialties: [] },
          streetwise: { rating: 0, specialties: [] },
          subterfuge: { rating: 0, specialties: [] },
          academics: { rating: 0, specialties: [] },
          awareness: { rating: 0, specialties: [] },
          finance: { rating: 0, specialties: [] },
          investigation: { rating: 0, specialties: [] },
          medicine: { rating: 0, specialties: [] },
          occult: { rating: 0, specialties: [] },
          politics: { rating: 0, specialties: [] },
          science: { rating: 0, specialties: [] },
          technology: { rating: 0, specialties: [] },
        },
      };

      const parsed = CharacterDataSchema.parse(input);
      expect(parsed.splat).toBe(Splat.Vampire5th);
      if (parsed.splat === Splat.Vampire5th) {
        expect(parsed.hunger).toBe(1);
      }
    });

    it("should correctly discriminate and route Werewolf5th payload", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "W5 Character",
        splat: Splat.Werewolf5th,
        rage: 2,
        harano: 1,
        hauglosk: 0,
        form: "Crinos",
        health: { total: 5, superficial: 0, aggravated: 0 },
        willpower: { total: 5, superficial: 0, aggravated: 0 },
        attributes: {
          strength: 3,
          dexterity: 3,
          stamina: 3,
          charisma: 2,
          manipulation: 2,
          composure: 2,
          intelligence: 2,
          wits: 2,
          resolve: 2,
        },
        skills: {
          athletics: { rating: 2, specialties: [] },
          brawl: { rating: 2, specialties: [] },
          craft: { rating: 0, specialties: [] },
          drive: { rating: 0, specialties: [] },
          firearms: { rating: 0, specialties: [] },
          melee: { rating: 0, specialties: [] },
          larceny: { rating: 0, specialties: [] },
          stealth: { rating: 0, specialties: [] },
          survival: { rating: 2, specialties: [] },
          animalKen: { rating: 0, specialties: [] },
          etiquette: { rating: 0, specialties: [] },
          insight: { rating: 0, specialties: [] },
          intimidation: { rating: 2, specialties: [] },
          leadership: { rating: 0, specialties: [] },
          performance: { rating: 0, specialties: [] },
          persuasion: { rating: 0, specialties: [] },
          streetwise: { rating: 0, specialties: [] },
          subterfuge: { rating: 0, specialties: [] },
          academics: { rating: 0, specialties: [] },
          awareness: { rating: 2, specialties: [] },
          finance: { rating: 0, specialties: [] },
          investigation: { rating: 0, specialties: [] },
          medicine: { rating: 0, specialties: [] },
          occult: { rating: 1, specialties: [] },
          politics: { rating: 0, specialties: [] },
          science: { rating: 0, specialties: [] },
          technology: { rating: 0, specialties: [] },
        },
      };

      const parsed = CharacterDataSchema.parse(input);
      expect(parsed.splat).toBe(Splat.Werewolf5th);
      if (parsed.splat === Splat.Werewolf5th) {
        expect(parsed.rage).toBe(2);
        expect(parsed.form).toBe("Crinos");
      }
    });

    it("should correctly discriminate and route Hunter5th payload", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "H5 Character",
        splat: Splat.Hunter5th,
        desperation: 2,
        danger: 3,
        despair: true,
        health: { total: 5, superficial: 0, aggravated: 0 },
        willpower: { total: 5, superficial: 0, aggravated: 0 },
        attributes: {
          strength: 2,
          dexterity: 2,
          stamina: 2,
          charisma: 2,
          manipulation: 2,
          composure: 2,
          intelligence: 2,
          wits: 2,
          resolve: 2,
        },
        skills: {
          athletics: { rating: 0, specialties: [] },
          brawl: { rating: 0, specialties: [] },
          craft: { rating: 0, specialties: [] },
          drive: { rating: 0, specialties: [] },
          firearms: { rating: 3, specialties: [] },
          melee: { rating: 0, specialties: [] },
          larceny: { rating: 0, specialties: [] },
          stealth: { rating: 0, specialties: [] },
          survival: { rating: 0, specialties: [] },
          animalKen: { rating: 0, specialties: [] },
          etiquette: { rating: 0, specialties: [] },
          insight: { rating: 0, specialties: [] },
          intimidation: { rating: 0, specialties: [] },
          leadership: { rating: 0, specialties: [] },
          performance: { rating: 0, specialties: [] },
          persuasion: { rating: 0, specialties: [] },
          streetwise: { rating: 0, specialties: [] },
          subterfuge: { rating: 0, specialties: [] },
          academics: { rating: 0, specialties: [] },
          awareness: { rating: 0, specialties: [] },
          finance: { rating: 0, specialties: [] },
          investigation: { rating: 2, specialties: [] },
          medicine: { rating: 0, specialties: [] },
          occult: { rating: 0, specialties: [] },
          politics: { rating: 0, specialties: [] },
          science: { rating: 0, specialties: [] },
          technology: { rating: 0, specialties: [] },
        },
      };

      const parsed = CharacterDataSchema.parse(input);
      expect(parsed.splat).toBe(Splat.Hunter5th);
      if (parsed.splat === Splat.Hunter5th) {
        expect(parsed.desperation).toBe(2);
        expect(parsed.despair).toBe(true);
      }
    });

    it("should correctly discriminate and route Mage20th payload", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "M20 Character",
        splat: Splat.Mage20th,
        arete: 3,
        quintessence: { quintessence: 8, paradox: 2 },
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 6, current: 5 },
        attributes: {
          strength: { rating: 2, specialties: [] },
          dexterity: { rating: 2, specialties: [] },
          stamina: { rating: 2, specialties: [] },
          charisma: { rating: 2, specialties: [] },
          manipulation: { rating: 2, specialties: [] },
          appearance: { rating: 2, specialties: [] },
          perception: { rating: 3, specialties: [] },
          intelligence: { rating: 3, specialties: [] },
          wits: { rating: 2, specialties: [] },
        },
        skills: {
          alertness: { rating: 1, specialties: [] },
          athletics: { rating: 0, specialties: [] },
          awareness: { rating: 2, specialties: [] },
          brawl: { rating: 0, specialties: [] },
          empathy: { rating: 1, specialties: [] },
          expression: { rating: 0, specialties: [] },
          intimidation: { rating: 0, specialties: [] },
          leadership: { rating: 0, specialties: [] },
          streetwise: { rating: 0, specialties: [] },
          subterfuge: { rating: 0, specialties: [] },
          animalKen: { rating: 0, specialties: [] },
          crafts: { rating: 0, specialties: [] },
          drive: { rating: 0, specialties: [] },
          etiquette: { rating: 0, specialties: [] },
          firearms: { rating: 0, specialties: [] },
          larceny: { rating: 0, specialties: [] },
          melee: { rating: 0, specialties: [] },
          performance: { rating: 0, specialties: [] },
          stealth: { rating: 0, specialties: [] },
          survival: { rating: 0, specialties: [] },
          academics: { rating: 2, specialties: [] },
          computer: { rating: 1, specialties: [] },
          finance: { rating: 0, specialties: [] },
          investigation: { rating: 1, specialties: [] },
          law: { rating: 0, specialties: [] },
          medicine: { rating: 0, specialties: [] },
          occult: { rating: 3, specialties: [] },
          politics: { rating: 0, specialties: [] },
          science: { rating: 1, specialties: [] },
          technology: { rating: 0, specialties: [] },
        },
      };

      const parsed = CharacterDataSchema.parse(input);
      expect(parsed.splat).toBe(Splat.Mage20th);
      if (parsed.splat === Splat.Mage20th) {
        expect(parsed.arete).toBe(3);
        expect(parsed.quintessence.quintessence).toBe(8);
      }
    });

    it("should reject Mage20th if quintessence + paradox exceeds 20", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "M20 Broken Character",
        splat: Splat.Mage20th,
        arete: 3,
        quintessence: { quintessence: 15, paradox: 10 }, // 15 + 10 = 25 > 20
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 6, current: 5 },
        attributes: {
          strength: { rating: 2, specialties: [] },
          dexterity: { rating: 2, specialties: [] },
          stamina: { rating: 2, specialties: [] },
          charisma: { rating: 2, specialties: [] },
          manipulation: { rating: 2, specialties: [] },
          appearance: { rating: 2, specialties: [] },
          perception: { rating: 3, specialties: [] },
          intelligence: { rating: 3, specialties: [] },
          wits: { rating: 2, specialties: [] },
        },
        skills: {
          alertness: { rating: 1, specialties: [] },
          athletics: { rating: 0, specialties: [] },
          awareness: { rating: 2, specialties: [] },
          brawl: { rating: 0, specialties: [] },
          empathy: { rating: 1, specialties: [] },
          expression: { rating: 0, specialties: [] },
          intimidation: { rating: 0, specialties: [] },
          leadership: { rating: 0, specialties: [] },
          streetwise: { rating: 0, specialties: [] },
          subterfuge: { rating: 0, specialties: [] },
          animalKen: { rating: 0, specialties: [] },
          crafts: { rating: 0, specialties: [] },
          drive: { rating: 0, specialties: [] },
          etiquette: { rating: 0, specialties: [] },
          firearms: { rating: 0, specialties: [] },
          larceny: { rating: 0, specialties: [] },
          melee: { rating: 0, specialties: [] },
          performance: { rating: 0, specialties: [] },
          stealth: { rating: 0, specialties: [] },
          survival: { rating: 0, specialties: [] },
          academics: { rating: 2, specialties: [] },
          computer: { rating: 1, specialties: [] },
          finance: { rating: 0, specialties: [] },
          investigation: { rating: 1, specialties: [] },
          law: { rating: 0, specialties: [] },
          medicine: { rating: 0, specialties: [] },
          occult: { rating: 3, specialties: [] },
          politics: { rating: 0, specialties: [] },
          science: { rating: 1, specialties: [] },
          technology: { rating: 0, specialties: [] },
        },
      };

      expect(() => CharacterDataSchema.parse(input)).toThrow(
        /The combined total of Paradox and Quintessence cannot exceed 20/
      );
    });

    it("should correctly discriminate and route Changeling20th payload", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "C20 Character",
        splat: Splat.Changeling20th,
        glamour: { total: 5, current: 4 },
        banality: { permanent: 4, temporary: 2 },
        nightmare: { permanent: 1, temporary: 3 },
        chimericalHealth: { total: 7, bashing: 1, lethal: 0, aggravated: 0 },
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 6, current: 5 },
        attributes: {
          strength: { rating: 2, specialties: [] },
          dexterity: { rating: 2, specialties: [] },
          stamina: { rating: 2, specialties: [] },
          charisma: { rating: 2, specialties: [] },
          manipulation: { rating: 2, specialties: [] },
          appearance: { rating: 2, specialties: [] },
          perception: { rating: 2, specialties: [] },
          intelligence: { rating: 2, specialties: [] },
          wits: { rating: 2, specialties: [] },
        },
        skills: {
          alertness: { rating: 0, specialties: [] },
          athletics: { rating: 0, specialties: [] },
          awareness: { rating: 0, specialties: [] },
          brawl: { rating: 0, specialties: [] },
          empathy: { rating: 0, specialties: [] },
          expression: { rating: 0, specialties: [] },
          intimidation: { rating: 0, specialties: [] },
          leadership: { rating: 0, specialties: [] },
          streetwise: { rating: 0, specialties: [] },
          subterfuge: { rating: 0, specialties: [] },
          animalKen: { rating: 0, specialties: [] },
          crafts: { rating: 0, specialties: [] },
          drive: { rating: 0, specialties: [] },
          etiquette: { rating: 0, specialties: [] },
          firearms: { rating: 0, specialties: [] },
          larceny: { rating: 0, specialties: [] },
          melee: { rating: 0, specialties: [] },
          performance: { rating: 0, specialties: [] },
          stealth: { rating: 0, specialties: [] },
          survival: { rating: 0, specialties: [] },
          academics: { rating: 0, specialties: [] },
          computer: { rating: 0, specialties: [] },
          finance: { rating: 0, specialties: [] },
          investigation: { rating: 0, specialties: [] },
          law: { rating: 0, specialties: [] },
          medicine: { rating: 0, specialties: [] },
          occult: { rating: 0, specialties: [] },
          politics: { rating: 0, specialties: [] },
          science: { rating: 0, specialties: [] },
          technology: { rating: 0, specialties: [] },
        },
      };

      const parsed = CharacterDataSchema.parse(input);
      expect(parsed.splat).toBe(Splat.Changeling20th);
      if (parsed.splat === Splat.Changeling20th) {
        expect(parsed.banality.permanent).toBe(4);
        expect(parsed.chimericalHealth.bashing).toBe(1);
      }
    });

    it("should reject unrecognized splat types", () => {
      const input = {
        id: validSnowflakeId,
        userId: validUserId,
        name: "Unknown Splat",
        splat: "alien5th",
      };

      expect(() => CharacterDataSchema.parse(input)).toThrow();
    });
  });
});
