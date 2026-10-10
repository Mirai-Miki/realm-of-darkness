import { z } from "zod";
import { BaseCharacterDataSchema } from "../character.definitions";
import type { ICharacter } from "../character.definitions";
import { Splat } from "../character.definitions";

export const Wod20CharacterConstraints = {
  AttributesSkillValues: { Min: 0, Max: 5 },
  Specialties: { MinLength: 0, MaxLength: 100 },
  Health: { Min: 7, Max: 15 },
  Willpower: { Min: 1, Max: 10 },
} as const;

export const Splats20th = [
  Splat.Vampire20th,
  Splat.Werewolf20th,
  Splat.Changeling20th,
  Splat.Mage20th,
  Splat.Demon20th,
  Splat.Wraith20th,
  Splat.Human20th,
  Splat.Ghoul20th,
] as const;

export const Wod20AttributeSkillDataSchema = z.object({
  rating: z
    .int()
    .min(Wod20CharacterConstraints.AttributesSkillValues.Min)
    .max(Wod20CharacterConstraints.AttributesSkillValues.Max),
  specialties: z
    .array(
      z
        .string()
        .min(Wod20CharacterConstraints.Specialties.MinLength)
        .max(Wod20CharacterConstraints.Specialties.MaxLength)
    )
    .default([])
    .readonly(),
});
export type Wod20AttributeSkillData = z.infer<
  typeof Wod20AttributeSkillDataSchema
>;

export const Wod20AttributesDataSchema = z.object({
  strength: Wod20AttributeSkillDataSchema,
  dexterity: Wod20AttributeSkillDataSchema,
  stamina: Wod20AttributeSkillDataSchema,
  charisma: Wod20AttributeSkillDataSchema,
  manipulation: Wod20AttributeSkillDataSchema,
  appearance: Wod20AttributeSkillDataSchema,
  perception: Wod20AttributeSkillDataSchema,
  intelligence: Wod20AttributeSkillDataSchema,
  wits: Wod20AttributeSkillDataSchema,
});
export type Wod20AttributesData = z.infer<typeof Wod20AttributesDataSchema>;

export const Wod20SkillsDataSchema = z.object({
  // Talents
  alertness: Wod20AttributeSkillDataSchema,
  athletics: Wod20AttributeSkillDataSchema,
  awareness: Wod20AttributeSkillDataSchema,
  brawl: Wod20AttributeSkillDataSchema,
  empathy: Wod20AttributeSkillDataSchema,
  expression: Wod20AttributeSkillDataSchema,
  intimidation: Wod20AttributeSkillDataSchema,
  leadership: Wod20AttributeSkillDataSchema,
  streetwise: Wod20AttributeSkillDataSchema,
  subterfuge: Wod20AttributeSkillDataSchema,
  // Skills
  animalKen: Wod20AttributeSkillDataSchema,
  crafts: Wod20AttributeSkillDataSchema,
  drive: Wod20AttributeSkillDataSchema,
  etiquette: Wod20AttributeSkillDataSchema,
  firearms: Wod20AttributeSkillDataSchema,
  larceny: Wod20AttributeSkillDataSchema,
  melee: Wod20AttributeSkillDataSchema,
  performance: Wod20AttributeSkillDataSchema,
  stealth: Wod20AttributeSkillDataSchema,
  survival: Wod20AttributeSkillDataSchema,
  // Knowledges
  academics: Wod20AttributeSkillDataSchema,
  computer: Wod20AttributeSkillDataSchema,
  finance: Wod20AttributeSkillDataSchema,
  investigation: Wod20AttributeSkillDataSchema,
  law: Wod20AttributeSkillDataSchema,
  medicine: Wod20AttributeSkillDataSchema,
  occult: Wod20AttributeSkillDataSchema,
  politics: Wod20AttributeSkillDataSchema,
  science: Wod20AttributeSkillDataSchema,
  technology: Wod20AttributeSkillDataSchema,
});
export type Wod20SkillsData = z.infer<typeof Wod20SkillsDataSchema>;

export const HealthTracker20thDataSchema = z
  .object({
    total: z
      .int()
      .min(Wod20CharacterConstraints.Health.Min)
      .max(Wod20CharacterConstraints.Health.Max),
    bashing: z.int().min(0).default(0),
    lethal: z.int().min(0).default(0),
    aggravated: z.int().min(0).default(0),
  })
  .refine(
    (data) => data.bashing + data.lethal + data.aggravated <= data.total,
    {
      message: "Damage cannot exceed Total Health",
    }
  );
export type HealthTracker20thData = z.infer<typeof HealthTracker20thDataSchema>;

export const WillpowerTracker20thDataSchema = z
  .object({
    total: z
      .int()
      .min(Wod20CharacterConstraints.Willpower.Min)
      .max(Wod20CharacterConstraints.Willpower.Max),
    current: z.int().min(0),
  })
  .refine((data) => data.current <= data.total, {
    message: "Current willpower cannot exceed total",
    path: ["current"],
  });
export type WillpowerTracker20thData = z.infer<
  typeof WillpowerTracker20thDataSchema
>;

export const Character20thSheetSchema = z.object({
  health: HealthTracker20thDataSchema,
  willpower: WillpowerTracker20thDataSchema,
  attributes: Wod20AttributesDataSchema,
  skills: Wod20SkillsDataSchema,
});
export type Character20thSheetData = z.infer<typeof Character20thSheetSchema>;

export const Character20thDataSchema = BaseCharacterDataSchema.extend(
  Character20thSheetSchema.shape
);
export type Character20thData = z.infer<typeof Character20thDataSchema>;

// ===========================================================================
// 20th Edition Character Entity Interfaces
// ===========================================================================

/**
 * Base character interface for 20th Anniversary game systems.
 */
export interface ICharacter20th extends ICharacter {
  // 20th Anniversary specific mechanics
  get willpower(): IWillpowerTracker20th;
  get health(): IHealthTracker20th;
  get attributes(): Wod20AttributesData;
  get skills(): Wod20SkillsData;

  toData(): Character20thData;
}

/**
 * 20th Anniversary Attribute Value object
 */
export interface IAttributeSkill20th extends Wod20AttributeSkillData {
  readonly rating: number;
  readonly specialties: readonly string[];

  hasSpecialty(specialty: string): boolean;
  addSpecialty(specialty: string): IAttributeSkill20th;
  removeSpecialty(specialty: string): IAttributeSkill20th;
  setRating(rating: number): IAttributeSkill20th;
  increaseRating(): IAttributeSkill20th;
  decreaseRating(): IAttributeSkill20th;
}

/**
 * Health tracker interface for 20th Anniversary.
 */
export interface IHealthTracker20th extends HealthTracker20thData {
  readonly total: number;
  readonly bashing: number;
  readonly lethal: number;
  readonly aggravated: number;

  // Methods
  takeDamage(damage: {
    bashing?: number;
    lethal?: number;
    aggravated?: number;
  }): IHealthTracker20th;
  heal(damage: {
    bashing?: number;
    lethal?: number;
    aggravated?: number;
  }): IHealthTracker20th;
  setCurrent(damage: {
    bashing?: number;
    lethal?: number;
    aggravated?: number;
  }): IHealthTracker20th;
  setTotal(value: number): IHealthTracker20th;
  addTotal(amount: number): IHealthTracker20th;
  removeTotal(amount: number): IHealthTracker20th;
}

/**
 * Willpower tracker interface for 20th Anniversary.
 */
export interface IWillpowerTracker20th extends WillpowerTracker20thData {
  readonly total: number;
  readonly current: number;

  // Methods
  spend(amount: number): IWillpowerTracker20th;
  restore(amount: number): IWillpowerTracker20th;
  setCurrent(value: number): IWillpowerTracker20th;
  setTotal(value: number): IWillpowerTracker20th;
  addTotal(amount: number): IWillpowerTracker20th;
  removeTotal(amount: number): IWillpowerTracker20th;
}
