import {
  CharacterDataSchema,
  RealmError,
  Splat,
  generateSnowflake,
} from "@realm/common";
import type { CharacterData, Snowflake } from "@realm/common";
import { Vampire5th } from "./vampire-5th.entity";
import { Werewolf5th } from "./werewolf-5th.entity";
import { Hunter5th } from "./hunter-5th.entity";
import { Human5th } from "./human-5th.entity";
import { Ghoul5th } from "./ghoul-5th.entity";
import { Vampire20th } from "./vampire-20th.entity";
import { Werewolf20th } from "./werewolf-20th.entity";
import { Mage20th } from "./mage-20th.entity";
import { Changeling20th } from "./changeling-20th.entity";
import { Demon20th } from "./demon-20th.entity";
import { Wraith20th } from "./wraith-20th.entity";
import { Human20th } from "./human-20th.entity";
import { Ghoul20th } from "./ghoul-20th.entity";

/**
 * Union of all concrete character entity types across all supported splats.
 */
export type CharacterEntity =
  | Vampire5th
  | Werewolf5th
  | Hunter5th
  | Human5th
  | Ghoul5th
  | Vampire20th
  | Werewolf20th
  | Mage20th
  | Changeling20th
  | Demon20th
  | Wraith20th
  | Human20th
  | Ghoul20th;

/**
 * Input parameters for generating initial default character sheet data.
 */
export interface CreateDefaultCharacterInput {
  /** Optional pre-assigned Snowflake ID */
  id?: Snowflake;
  /** Owning user's Snowflake ID */
  userId: Snowflake;
  /** Character name */
  name: string;
  /** Splat game line */
  splat: Splat;
  /** Optional clan or lineage */
  clan?: string;
  /** Optional associated chronicle */
  chronicleId?: Snowflake | null;
}

/**
 * Generates default 5th Edition attributes (all set to baseline 2).
 */
function createDefaultV5Attributes() {
  return {
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
}

/**
 * Generates default 5th Edition skills (all set to 0 with empty specialties).
 */
function createDefaultV5Skills() {
  const emptySkill = { rating: 0, specialties: [] };
  return {
    athletics: emptySkill,
    brawl: emptySkill,
    craft: emptySkill,
    drive: emptySkill,
    firearms: emptySkill,
    melee: emptySkill,
    larceny: emptySkill,
    stealth: emptySkill,
    survival: emptySkill,
    animalKen: emptySkill,
    etiquette: emptySkill,
    insight: emptySkill,
    intimidation: emptySkill,
    leadership: emptySkill,
    performance: emptySkill,
    persuasion: emptySkill,
    streetwise: emptySkill,
    subterfuge: emptySkill,
    academics: emptySkill,
    awareness: emptySkill,
    finance: emptySkill,
    investigation: emptySkill,
    medicine: emptySkill,
    occult: emptySkill,
    politics: emptySkill,
    science: emptySkill,
    technology: emptySkill,
  };
}

/**
 * Generates default 20th Anniversary Edition attributes (all set to baseline 2).
 */
function createDefaultV20Attributes() {
  const defaultAttr = { rating: 2, specialties: [] };
  return {
    strength: defaultAttr,
    dexterity: defaultAttr,
    stamina: defaultAttr,
    charisma: defaultAttr,
    manipulation: defaultAttr,
    appearance: defaultAttr,
    perception: defaultAttr,
    intelligence: defaultAttr,
    wits: defaultAttr,
  };
}

/**
 * Generates default 20th Anniversary Edition skills (all set to 0 with empty specialties).
 */
function createDefaultV20Skills() {
  const emptySkill = { rating: 0, specialties: [] };
  return {
    alertness: emptySkill,
    athletics: emptySkill,
    awareness: emptySkill,
    brawl: emptySkill,
    empathy: emptySkill,
    expression: emptySkill,
    intimidation: emptySkill,
    leadership: emptySkill,
    streetwise: emptySkill,
    subterfuge: emptySkill,
    animalKen: emptySkill,
    crafts: emptySkill,
    drive: emptySkill,
    etiquette: emptySkill,
    firearms: emptySkill,
    larceny: emptySkill,
    melee: emptySkill,
    performance: emptySkill,
    stealth: emptySkill,
    survival: emptySkill,
    academics: emptySkill,
    computer: emptySkill,
    finance: emptySkill,
    investigation: emptySkill,
    law: emptySkill,
    medicine: emptySkill,
    occult: emptySkill,
    politics: emptySkill,
    science: emptySkill,
    technology: emptySkill,
  };
}

/**
 * Factory for creating Character entities and default character sheet data DTOs.
 * Automatically hydrates the correct entity class based on the splat type.
 */
export class CharacterFactory {
  /**
   * Create a domain entity from character data.
   *
   * @param data - The character data DTO
   * @returns The hydrated character entity
   */
  public static create(data: CharacterData): CharacterEntity {
    switch (data.splat) {
      // 5th Edition
      case Splat.Vampire5th:
        return new Vampire5th(data);
      case Splat.Werewolf5th:
        return new Werewolf5th(data);
      case Splat.Hunter5th:
        return new Hunter5th(data);
      case Splat.Human5th:
        return new Human5th(data);
      case Splat.Ghoul5th:
        return new Ghoul5th(data);

      // 20th Anniversary Edition
      case Splat.Vampire20th:
        return new Vampire20th(data);
      case Splat.Werewolf20th:
        return new Werewolf20th(data);
      case Splat.Mage20th:
        return new Mage20th(data);
      case Splat.Changeling20th:
        return new Changeling20th(data);
      case Splat.Demon20th:
        return new Demon20th(data);
      case Splat.Wraith20th:
        return new Wraith20th(data);
      case Splat.Human20th:
        return new Human20th(data);
      case Splat.Ghoul20th:
        return new Ghoul20th(data);
    }
  }

  /**
   * Generates a fully validated default CharacterData DTO for a new character.
   *
   * @param input - The basic character identity options
   * @returns Complete, validated CharacterData ready for database insertion
   * @throws {RealmError} If the specified splat is unsupported
   *
   * @example
   * ```typescript
   * const data = CharacterFactory.createDefaultData({
   *   userId: "123456789012345678",
   *   name: "Helena",
   *   splat: Splat.Vampire5th,
   *   clan: "Toreador",
   * });
   * ```
   */
  public static createDefaultData(
    input: CreateDefaultCharacterInput
  ): CharacterData {
    const id = input.id ?? generateSnowflake();
    const now = new Date();
    const base = {
      id,
      userId: input.userId,
      chronicleId: input.chronicleId ?? null,
      name: input.name,
      status: "Active" as const,
      avatarUrl: null,
      themeColor: "#000000",
      createdAt: now,
      lastUpdated: now,
      experience: { current: 0, total: 0 },
    };

    let rawData: unknown;

    switch (input.splat) {
      case Splat.Vampire5th:
        rawData = {
          ...base,
          splat: Splat.Vampire5th,
          health: { total: 6, superficial: 0, aggravated: 0 },
          willpower: { total: 5, superficial: 0, aggravated: 0 },
          attributes: createDefaultV5Attributes(),
          skills: createDefaultV5Skills(),
          hunger: 1,
          humanity: { total: 7, stains: 0 },
          bloodPotency: 0,
          generation: 13,
        };
        break;

      case Splat.Werewolf5th:
        rawData = {
          ...base,
          splat: Splat.Werewolf5th,
          health: { total: 6, superficial: 0, aggravated: 0 },
          willpower: { total: 5, superficial: 0, aggravated: 0 },
          attributes: createDefaultV5Attributes(),
          skills: createDefaultV5Skills(),
          rage: 2,
          harano: 0,
          hauglosk: 0,
          form: "Homid",
        };
        break;

      case Splat.Hunter5th:
        rawData = {
          ...base,
          splat: Splat.Hunter5th,
          health: { total: 6, superficial: 0, aggravated: 0 },
          willpower: { total: 5, superficial: 0, aggravated: 0 },
          attributes: createDefaultV5Attributes(),
          skills: createDefaultV5Skills(),
          desperation: 1,
          danger: 1,
          despair: false,
        };
        break;

      case Splat.Human5th:
        rawData = {
          ...base,
          splat: Splat.Human5th,
          health: { total: 6, superficial: 0, aggravated: 0 },
          willpower: { total: 5, superficial: 0, aggravated: 0 },
          attributes: createDefaultV5Attributes(),
          skills: createDefaultV5Skills(),
        };
        break;

      case Splat.Ghoul5th:
        rawData = {
          ...base,
          splat: Splat.Ghoul5th,
          health: { total: 6, superficial: 0, aggravated: 0 },
          willpower: { total: 5, superficial: 0, aggravated: 0 },
          attributes: createDefaultV5Attributes(),
          skills: createDefaultV5Skills(),
        };
        break;

      case Splat.Vampire20th:
        rawData = {
          ...base,
          splat: Splat.Vampire20th,
          health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
          willpower: { total: 5, current: 5 },
          attributes: createDefaultV20Attributes(),
          skills: createDefaultV20Skills(),
          bloodPool: { total: 10, current: 10 },
          morality: { value: 7, name: "Humanity" },
        };
        break;

      case Splat.Werewolf20th:
        rawData = {
          ...base,
          splat: Splat.Werewolf20th,
          health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
          willpower: { total: 5, current: 5 },
          attributes: createDefaultV20Attributes(),
          skills: createDefaultV20Skills(),
          rage: { total: 5, current: 5 },
          gnosis: { total: 5, current: 5 },
        };
        break;

      case Splat.Mage20th:
        rawData = {
          ...base,
          splat: Splat.Mage20th,
          health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
          willpower: { total: 5, current: 5 },
          attributes: createDefaultV20Attributes(),
          skills: createDefaultV20Skills(),
          arete: 1,
          quintessence: { quintessence: 5, paradox: 0 },
        };
        break;

      case Splat.Changeling20th:
        rawData = {
          ...base,
          splat: Splat.Changeling20th,
          health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
          willpower: { total: 5, current: 5 },
          attributes: createDefaultV20Attributes(),
          skills: createDefaultV20Skills(),
          glamour: { total: 4, current: 4 },
          banality: { permanent: 3, temporary: 0 },
          nightmare: { permanent: 0, temporary: 0 },
          chimericalHealth: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
        };
        break;

      case Splat.Demon20th:
        rawData = {
          ...base,
          splat: Splat.Demon20th,
          health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
          willpower: { total: 5, current: 5 },
          attributes: createDefaultV20Attributes(),
          skills: createDefaultV20Skills(),
          faith: { total: 10, current: 5 },
          torment: { permanent: 4, temporary: 0 },
        };
        break;

      case Splat.Wraith20th:
        rawData = {
          ...base,
          splat: Splat.Wraith20th,
          health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
          willpower: { total: 5, current: 5 },
          attributes: createDefaultV20Attributes(),
          skills: createDefaultV20Skills(),
          corpus: { total: 10, current: 10 },
          pathos: { total: 10, current: 5 },
          angst: { permanent: 0, temporary: 0 },
        };
        break;

      case Splat.Human20th:
        rawData = {
          ...base,
          splat: Splat.Human20th,
          health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
          willpower: { total: 5, current: 5 },
          attributes: createDefaultV20Attributes(),
          skills: createDefaultV20Skills(),
          blood: 10,
          humanity: 7,
        };
        break;

      case Splat.Ghoul20th:
        rawData = {
          ...base,
          splat: Splat.Ghoul20th,
          health: { total: 7, bashing: 0, lethal: 0, aggravated: 0 },
          willpower: { total: 5, current: 5 },
          attributes: createDefaultV20Attributes(),
          skills: createDefaultV20Skills(),
          blood: 10,
          vitae: 2,
          humanity: 7,
        };
        break;

      default: {
        const unknownSplat = String(input.splat);
        throw new RealmError(
          `Unsupported splat for default data: ${unknownSplat}`
        );
      }
    }

    return CharacterDataSchema.parse(rawData);
  }
}
