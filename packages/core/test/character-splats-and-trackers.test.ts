import {
  CharacterFactory,
  ConsumableTrackerVO,
  CounterTrackerVO,
  Humanity5thVO,
  MageQuintessenceVO,
  WerewolfFormVO,
  Werewolf5th,
  Hunter5th,
  Werewolf20th,
  Mage20th,
  Changeling20th,
  Demon20th,
  Wraith20th,
  Ghoul20th,
  Human20th,
} from "../src";
import { RealmError, Splat } from "@realm/common";

describe("Character Splats & Domain Trackers", () => {
  const validSnowflakeId = "123456789012345678";
  const validUserId = "987654321098765432";

  const defaultV5Attributes = {
    strength: 2,
    dexterity: 2,
    stamina: 2,
    charisma: 2,
    manipulation: 2,
    composure: 2,
    intelligence: 2,
    wits: 2,
    resolve: 2,
  };

  const defaultV5Skills = {
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
  };

  const defaultV20Attributes = {
    strength: { rating: 2, specialties: [] },
    dexterity: { rating: 2, specialties: [] },
    stamina: { rating: 2, specialties: [] },
    charisma: { rating: 2, specialties: [] },
    manipulation: { rating: 2, specialties: [] },
    appearance: { rating: 2, specialties: [] },
    perception: { rating: 2, specialties: [] },
    intelligence: { rating: 2, specialties: [] },
    wits: { rating: 2, specialties: [] },
  };

  const defaultV20Skills = {
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
  };

  describe("Humanity5thVO", () => {
    it("should calculate empty boxes and degeneration overflow accurately", () => {
      // Humanity 7: empty boxes = 10 - 7 = 3
      const vo = new Humanity5thVO({ total: 7, stains: 2 });
      expect(vo.emptyBoxes).toBe(1); // 10 - 7 - 2 = 1
      expect(vo.degenerationOverflow).toBe(0);
      expect(vo.isDegenerating()).toBe(false);

      // Add 2 more stains -> total 4 stains vs 3 available boxes = 1 overflow
      const degenerating = vo.takeStains(2);
      expect(degenerating.stains).toBe(4);
      expect(degenerating.emptyBoxes).toBe(0);
      expect(degenerating.degenerationOverflow).toBe(1);
      expect(degenerating.isDegenerating()).toBe(true);
    });

    it("should clear stains on remorse check", () => {
      const vo = new Humanity5thVO({ total: 7, stains: 3 });
      const cleared = vo.clearStains();
      expect(cleared.stains).toBe(0);
      expect(cleared.total).toBe(7);
    });

    it("should reset stains if humanity rating decreases", () => {
      const vo = new Humanity5thVO({ total: 7, stains: 3 });
      const reduced = vo.setTotal(6);
      expect(reduced.total).toBe(6);
      expect(reduced.stains).toBe(0);
    });
  });

  describe("ConsumableTrackerVO", () => {
    it("should spend and restore points within bounds", () => {
      const pool = new ConsumableTrackerVO({ total: 10, current: 8, min: 1 });
      const spent = pool.spend(3);
      expect(spent.current).toBe(5);

      const restored = spent.gain(10);
      expect(restored.current).toBe(10); // Capped at total
    });

    it("should enforce minimum bound on spend", () => {
      const pool = new ConsumableTrackerVO({ total: 5, current: 2, min: 1 });
      expect(() => pool.spend(2)).toThrow(RealmError); // 2 - 2 = 0 < min 1
    });

    it("should support unlocked pools where current can exceed total", () => {
      const unlocked = new ConsumableTrackerVO({
        total: 5,
        current: 5,
        min: 0,
        unlockedMax: 10,
      });

      const boosted = unlocked.gain(4);
      expect(boosted.current).toBe(9);
      expect(boosted.total).toBe(5);
    });
  });

  describe("CounterTrackerVO", () => {
    it("should accumulate temporary points and roll over to permanent at 10", () => {
      const counter = new CounterTrackerVO({ permanent: 3, temporary: 8 });
      // Add 4 temporary -> total 12: 12 / 10 = 1 permanent increment, remainder 2
      const rolled = counter.gainTemporary(4);
      expect(rolled.permanent).toBe(4);
      expect(rolled.temporary).toBe(2);
    });

    it("should handle large increments across multiple tens", () => {
      const counter = new CounterTrackerVO({ permanent: 2, temporary: 0 });
      // Add 25 temporary -> 2 permanent increments, remainder 5
      const rolled = counter.gainTemporary(25);
      expect(rolled.permanent).toBe(4);
      expect(rolled.temporary).toBe(5);
    });
  });

  describe("MageQuintessenceVO", () => {
    it("should enforce the invariant: quintessence + paradox <= 20", () => {
      expect(
        () =>
          new MageQuintessenceVO({
            quintessence: 15,
            paradox: 10,
          })
      ).toThrow(RealmError);
    });

    it("should compress quintessence down when gaining paradox", () => {
      const wheel = new MageQuintessenceVO({ quintessence: 15, paradox: 2 });
      // Gaining 5 paradox -> paradox becomes 7; max quint is 20 - 7 = 13
      const updated = wheel.gainParadox(5);
      expect(updated.paradox).toBe(7);
      expect(updated.quintessence).toBe(13); // Compressed from 15 to 13
    });

    it("should cap gained quintessence by 20 - paradox", () => {
      const wheel = new MageQuintessenceVO({ quintessence: 5, paradox: 8 });
      // Max quintessence is 12 (20 - 8). Trying to gain 10 only reaches 12.
      const updated = wheel.gainQuintessence(10);
      expect(updated.quintessence).toBe(12);
      expect(updated.paradox).toBe(8);
    });
  });

  describe("WerewolfFormVO", () => {
    it("should apply +4 health modifier on Crinos and revert upon shifting back", () => {
      const homid = new WerewolfFormVO("Homid");
      expect(homid.healthModifier).toBe(0);

      const shiftToCrinos = homid.shift("Crinos");
      expect(shiftToCrinos.healthDelta).toBe(4);
      expect(shiftToCrinos.formVO.healthModifier).toBe(4);

      const shiftBack = shiftToCrinos.formVO.shift("Hispo");
      expect(shiftBack.healthDelta).toBe(-4);
      expect(shiftBack.formVO.healthModifier).toBe(0);
    });
  });

  describe("Concrete Splat Entities", () => {
    it("Werewolf5th: shifting form dynamically adjusts health tracker", () => {
      const werewolf = new Werewolf5th({
        id: validSnowflakeId,
        userId: validUserId,
        chronicleId: null,
        name: "Fenris",
        splat: Splat.Werewolf5th,
        status: "Active",
        avatarUrl: null,
        themeColor: "#000000",
        createdAt: new Date(),
        lastUpdated: new Date(),
        experience: { current: 0, total: 0 },
        health: { total: 6, superficial: 0, aggravated: 0 },
        willpower: { total: 5, superficial: 0, aggravated: 0 },
        attributes: defaultV5Attributes,
        skills: defaultV5Skills,
        rage: 2,
        harano: 0,
        hauglosk: 0,
        form: "Homid",
      });

      expect(werewolf.health.total).toBe(6);
      expect(werewolf.form).toBe("Homid");

      werewolf.setForm("Crinos");
      expect(werewolf.health.total).toBe(10); // 6 + 4
      expect(werewolf.form).toBe("Crinos");

      werewolf.setForm("Lupus");
      expect(werewolf.health.total).toBe(6); // Reverted back
      expect(werewolf.form).toBe("Lupus");
    });

    it("Hunter5th: manages desperation, danger, and despair", () => {
      const hunter = new Hunter5th({
        id: validSnowflakeId,
        userId: validUserId,
        chronicleId: null,
        name: "Carter",
        splat: Splat.Hunter5th,
        status: "Active",
        avatarUrl: null,
        themeColor: "#000000",
        createdAt: new Date(),
        lastUpdated: new Date(),
        experience: { current: 0, total: 0 },
        health: { total: 5, superficial: 0, aggravated: 0 },
        willpower: { total: 5, superficial: 0, aggravated: 0 },
        attributes: defaultV5Attributes,
        skills: defaultV5Skills,
        desperation: 1,
        danger: 2,
        despair: false,
      });

      hunter.increaseDesperation(2);
      expect(hunter.desperation).toBe(3);

      hunter.setDespair(true);
      expect(hunter.despair).toBe(true);

      const serialized = hunter.toData();
      expect(serialized.desperation).toBe(3);
      expect(serialized.despair).toBe(true);
    });

    it("Mage20th: manages arete and quintessence/paradox", () => {
      const mage = new Mage20th({
        id: validSnowflakeId,
        userId: validUserId,
        chronicleId: null,
        name: "Astrid",
        splat: Splat.Mage20th,
        status: "Active",
        avatarUrl: null,
        themeColor: "#000000",
        createdAt: new Date(),
        lastUpdated: new Date(),
        experience: { current: 0, total: 0 },
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 5, current: 5 },
        attributes: defaultV20Attributes,
        skills: defaultV20Skills,
        arete: 2,
        quintessence: { quintessence: 5, paradox: 0 },
      });

      mage.gainParadox(3);
      expect(mage.quintessence.paradox).toBe(3);

      mage.spendQuintessence(2);
      expect(mage.quintessence.quintessence).toBe(3);
    });

    it("Changeling20th: manages glamour and banality rollover", () => {
      const changeling = new Changeling20th({
        id: validSnowflakeId,
        userId: validUserId,
        chronicleId: null,
        name: "Robin",
        splat: Splat.Changeling20th,
        status: "Active",
        avatarUrl: null,
        themeColor: "#000000",
        createdAt: new Date(),
        lastUpdated: new Date(),
        experience: { current: 0, total: 0 },
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 5, current: 5 },
        attributes: defaultV20Attributes,
        skills: defaultV20Skills,
        glamour: { total: 4, current: 4 },
        banality: { permanent: 3, temporary: 8 },
        nightmare: { permanent: 0, temporary: 0 },
        chimericalHealth: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
      });

      changeling.gainBanality(4);
      expect(changeling.banality.permanent).toBe(4);
      expect(changeling.banality.temporary).toBe(2);
    });
  });

  describe("CharacterFactory Polymorphism", () => {
    it("should instantiate the correct concrete class for each splat", () => {
      const baseMeta = {
        id: validSnowflakeId,
        userId: validUserId,
        chronicleId: null,
        name: "Polymorphic Test",
        status: "Active" as const,
        avatarUrl: null,
        themeColor: "#000000",
        createdAt: new Date(),
        lastUpdated: new Date(),
        experience: { current: 0, total: 0 },
      };

      const w20Entity = CharacterFactory.create({
        ...baseMeta,
        splat: Splat.Werewolf20th,
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 5, current: 5 },
        attributes: defaultV20Attributes,
        skills: defaultV20Skills,
        rage: { total: 7, current: 7 },
        gnosis: { total: 7, current: 7 },
      });
      expect(w20Entity).toBeInstanceOf(Werewolf20th);

      const demonEntity = CharacterFactory.create({
        ...baseMeta,
        splat: Splat.Demon20th,
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 5, current: 5 },
        attributes: defaultV20Attributes,
        skills: defaultV20Skills,
        faith: { total: 10, current: 6 },
        torment: { permanent: 5, temporary: 0 },
      });
      expect(demonEntity).toBeInstanceOf(Demon20th);

      const wraithEntity = CharacterFactory.create({
        ...baseMeta,
        splat: Splat.Wraith20th,
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 5, current: 5 },
        attributes: defaultV20Attributes,
        skills: defaultV20Skills,
        corpus: { total: 10, current: 10 },
        pathos: { total: 10, current: 5 },
      });
      expect(wraithEntity).toBeInstanceOf(Wraith20th);

      const ghoul20Entity = CharacterFactory.create({
        ...baseMeta,
        splat: Splat.Ghoul20th,
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 5, current: 5 },
        attributes: defaultV20Attributes,
        skills: defaultV20Skills,
        blood: 10,
        vitae: 2,
        humanity: 7,
      });
      expect(ghoul20Entity).toBeInstanceOf(Ghoul20th);

      const human20Entity = CharacterFactory.create({
        ...baseMeta,
        splat: Splat.Human20th,
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 5, current: 5 },
        attributes: defaultV20Attributes,
        skills: defaultV20Skills,
        blood: 10,
        humanity: 7,
      });
      expect(human20Entity).toBeInstanceOf(Human20th);
    });

    it("should generate valid default CharacterData across all supported splats", () => {
      const allSplats = Object.values(Splat);
      for (const splat of allSplats) {
        const defaultData = CharacterFactory.createDefaultData({
          userId: validUserId,
          name: `Default ${splat}`,
          splat,
        });

        expect(defaultData.splat).toBe(splat);
        expect(defaultData.name).toBe(`Default ${splat}`);
        expect(defaultData.userId).toBe(validUserId);

        const entity = CharacterFactory.create(defaultData);
        expect(entity.splat).toBe(splat);
      }
    });

    it("Character5th: mutating health and willpower damage", () => {
      const werewolf = new Werewolf5th({
        id: validSnowflakeId,
        userId: validUserId,
        chronicleId: null,
        name: "Damage Test",
        splat: Splat.Werewolf5th,
        status: "Active",
        avatarUrl: null,
        themeColor: "#000000",
        createdAt: new Date(),
        lastUpdated: new Date(),
        experience: { current: 0, total: 0 },
        health: { total: 6, superficial: 0, aggravated: 0 },
        willpower: { total: 5, superficial: 0, aggravated: 0 },
        attributes: defaultV5Attributes,
        skills: defaultV5Skills,
        rage: 2,
        harano: 0,
        hauglosk: 0,
        form: "Homid",
      });

      werewolf.takeHealthDamage({ superficial: 2 });
      expect(werewolf.health.superficial).toBe(2);

      werewolf.healHealthDamage({ superficial: 1 });
      expect(werewolf.health.superficial).toBe(1);

      werewolf.setHealthDamage({ superficial: 3, aggravated: 1 });
      expect(werewolf.health.superficial).toBe(3);
      expect(werewolf.health.aggravated).toBe(1);

      werewolf.takeWillpowerDamage({ superficial: 2 });
      expect(werewolf.willpower.superficial).toBe(2);

      werewolf.healWillpowerDamage({ superficial: 1 });
      expect(werewolf.willpower.superficial).toBe(1);

      werewolf.setWillpowerDamage({ superficial: 0, aggravated: 0 });
      expect(werewolf.willpower.superficial).toBe(0);
    });

    it("Character20th: mutating health damage and willpower points", () => {
      const mage = new Mage20th({
        id: validSnowflakeId,
        userId: validUserId,
        chronicleId: null,
        name: "Damage Test 20",
        splat: Splat.Mage20th,
        status: "Active",
        avatarUrl: null,
        themeColor: "#000000",
        createdAt: new Date(),
        lastUpdated: new Date(),
        experience: { current: 0, total: 0 },
        health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        willpower: { total: 5, current: 5 },
        attributes: defaultV20Attributes,
        skills: defaultV20Skills,
        arete: 2,
        quintessence: { quintessence: 5, paradox: 0 },
      });

      mage.takeHealthDamage({ bashing: 2 });
      expect(mage.health.bashing).toBe(2);

      mage.healHealthDamage({ bashing: 1 });
      expect(mage.health.bashing).toBe(1);

      mage.setHealthDamage({ lethal: 3 });
      expect(mage.health.lethal).toBe(3);

      mage.spendWillpower(2);
      expect(mage.willpower.current).toBe(3);

      mage.restoreWillpower(1);
      expect(mage.willpower.current).toBe(4);

      mage.setWillpowerCurrent(2);
      expect(mage.willpower.current).toBe(2);
    });
  });
});
