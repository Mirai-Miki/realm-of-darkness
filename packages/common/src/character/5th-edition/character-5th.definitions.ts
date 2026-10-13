import type { ICharacter } from "../character.definitions";

import { z } from "zod";
import {
  BaseCharacterDataSchema,
  ExperienceTrackerSchema,
} from "../character.definitions";

// ============================================================================
// 5th Edition Character Constraints & Schema
// ============================================================================

export const Character5thConstraints = {
  Attribute: { Min: 1, Max: 5 },
  Skill: { Min: 0, Max: 5 },
  Specialty: { MinLength: 1, MaxLength: 100 },
  DamageTotal: { Min: 0, Max: 20 },
} as const;

export const Skill5thDataSchema = z.object({
  rating: z
    .int()
    .min(Character5thConstraints.Skill.Min)
    .max(Character5thConstraints.Skill.Max),
  specialties: z
    .array(
      z
        .string()
        .min(Character5thConstraints.Specialty.MinLength)
        .max(Character5thConstraints.Specialty.MaxLength)
    )
    .default([])
    .readonly(),
});
export type Skill5thData = z.infer<typeof Skill5thDataSchema>;

const Wod5AttributeDataSchema = z
  .int()
  .min(Character5thConstraints.Attribute.Min)
  .max(Character5thConstraints.Attribute.Max);

export const Wod5AttributesDataSchema = z.object({
  strength: Wod5AttributeDataSchema,
  dexterity: Wod5AttributeDataSchema,
  stamina: Wod5AttributeDataSchema,
  charisma: Wod5AttributeDataSchema,
  manipulation: Wod5AttributeDataSchema,
  composure: Wod5AttributeDataSchema,
  intelligence: Wod5AttributeDataSchema,
  wits: Wod5AttributeDataSchema,
  resolve: Wod5AttributeDataSchema,
});
export type Wod5AttributesData = z.infer<typeof Wod5AttributesDataSchema>;

export const Wod5SkillsDataSchema = z.object({
  // Physical
  athletics: Skill5thDataSchema,
  brawl: Skill5thDataSchema,
  craft: Skill5thDataSchema,
  drive: Skill5thDataSchema,
  firearms: Skill5thDataSchema,
  melee: Skill5thDataSchema,
  larceny: Skill5thDataSchema,
  stealth: Skill5thDataSchema,
  survival: Skill5thDataSchema,
  // Social
  animalKen: Skill5thDataSchema,
  etiquette: Skill5thDataSchema,
  insight: Skill5thDataSchema,
  intimidation: Skill5thDataSchema,
  leadership: Skill5thDataSchema,
  performance: Skill5thDataSchema,
  persuasion: Skill5thDataSchema,
  streetwise: Skill5thDataSchema,
  subterfuge: Skill5thDataSchema,
  // Mental
  academics: Skill5thDataSchema,
  awareness: Skill5thDataSchema,
  finance: Skill5thDataSchema,
  investigation: Skill5thDataSchema,
  medicine: Skill5thDataSchema,
  occult: Skill5thDataSchema,
  politics: Skill5thDataSchema,
  science: Skill5thDataSchema,
  technology: Skill5thDataSchema,
});
export type Wod5SkillsData = z.infer<typeof Wod5SkillsDataSchema>;

export const DamageTracker5thDataSchema = z
  .object({
    total: z
      .int()
      .min(Character5thConstraints.DamageTotal.Min)
      .max(Character5thConstraints.DamageTotal.Max),
    superficial: z.int().min(0).default(0),
    aggravated: z.int().min(0).default(0),
  })
  .refine((data) => data.superficial + data.aggravated <= data.total, {
    message: "Damage cannot exceed total tracker boxes",
  });
export type DamageTracker5thData = z.infer<typeof DamageTracker5thDataSchema>;

export const Character5thSheetSchema = z.object({
  experience: ExperienceTrackerSchema.default({ current: 0, total: 0 }),
  health: DamageTracker5thDataSchema,
  willpower: DamageTracker5thDataSchema,
  attributes: Wod5AttributesDataSchema,
  skills: Wod5SkillsDataSchema,
});
export type Character5thSheetData = z.infer<typeof Character5thSheetSchema>;

export const Character5thDataSchema = BaseCharacterDataSchema.extend(
  Character5thSheetSchema.shape
);
export type Character5thData = z.infer<typeof Character5thDataSchema>;

// ============================================================================
// 5th Edition Character Entity Interfaces
// ============================================================================

/**
 * Base character interface for all 5th Edition game systems.
 */
export interface ICharacter5th extends ICharacter {
  // 5th Edition specific mechanics (value objects - immutable)
  get willpower(): IDamageTracker5th;
  get health(): IDamageTracker5th;

  // Attributes
  get attributes(): Wod5AttributesData;

  // Skills (value objects)
  get skills(): Wod5SkillsData;

  takeHealthDamage(damage: { superficial?: number; aggravated?: number }): void;
  healHealthDamage(heal: { superficial?: number; aggravated?: number }): void;
  setHealthDamage(damage: { superficial?: number; aggravated?: number }): void;

  takeWillpowerDamage(damage: {
    superficial?: number;
    aggravated?: number;
  }): void;
  healWillpowerDamage(heal: {
    superficial?: number;
    aggravated?: number;
  }): void;
  setWillpowerDamage(damage: {
    superficial?: number;
    aggravated?: number;
  }): void;

  toData(): Character5thData;
}

/**
 * Damage tracker interface for 5th Edition games.
 * Immutable value object - all operations return new instances.
 */
export interface IDamageTracker5th extends DamageTracker5thData {
  readonly total: number;
  readonly superficial: number;
  readonly aggravated: number;

  totalDamage(): number; // superficial + aggravated
  isImpaired(): boolean; // Every box has damage
  isUndamaged(): boolean; // No damage taken
  isIncapacitated(): boolean; // aggravated == total

  takeSuperficial(amount: number): IDamageTracker5th;
  takeAggravated(amount: number): IDamageTracker5th;
  healSuperficial(amount: number): IDamageTracker5th;
  healAggravated(amount: number): IDamageTracker5th;
  setDamage(damage: {
    superficial?: number;
    aggravated?: number;
  }): IDamageTracker5th;
  setTotal(total: number): IDamageTracker5th;
}

/**
 * Skill value object interface for 5th Edition.
 * Immutable - all operations return new instances.
 */
export interface ISkill5th extends Skill5thData {
  readonly rating: number;
  readonly specialties: readonly string[];

  hasSpecialty(specialty: string): boolean;
  addSpecialty(specialty: string): ISkill5th;
  removeSpecialty(specialty: string): ISkill5th;
  setRating(rating: number): ISkill5th;
  increaseRating(): ISkill5th;
  decreaseRating(): ISkill5th;
}
