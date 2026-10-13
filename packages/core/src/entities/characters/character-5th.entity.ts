import type {
  Character5thData,
  ICharacter5th,
  IDamageTracker5th,
  Wod5AttributesData,
  Wod5SkillsData,
} from "@realm/common";

import { Character } from "./character.entity";
import { DamageTracker5th } from "./value-objects/damage-tracker-5th.vo";

/**
 * Base Character5th entity.
 * Contains shared 5th Edition mechanics (V5, H5, W5).
 *
 * @remarks
 * This class provides the foundation for all 5th Edition game systems:
 * - Vampire: The Masquerade 5th Edition
 * - Hunter: The Reckoning 5th Edition
 * - Werewolf: The Apocalypse 5th Edition
 *
 * Common 5th Edition mechanics:
 * - Superficial/Aggravated damage tracking
 * - 9 Attributes (Strength, Dexterity, Stamina, Charisma, Manipulation, Composure, Intelligence, Wits, Resolve)
 * - Skills with specialties
 *
 * This entity trusts that data passed to constructor is already validated at
 * boundaries (API/Bot edge, Repository edge). It only prevents internal
 * mutations that would violate business rules.
 */
export abstract class Character5th extends Character implements ICharacter5th {
  protected _health: IDamageTracker5th;
  protected _willpower: IDamageTracker5th;
  protected _attributes: Wod5AttributesData;
  protected _skills: Wod5SkillsData;

  constructor(data: Character5thData) {
    // Trust the data - already validated at boundary
    super(data);

    // Initialize from actual Data
    this._health = new DamageTracker5th(data.health);
    this._willpower = new DamageTracker5th(data.willpower);
    this._attributes = data.attributes;
    this._skills = data.skills;
  }

  // ============================================================================
  // 5th Edition Mechanics
  // ============================================================================

  get health(): IDamageTracker5th {
    return this._health;
  }

  get willpower(): IDamageTracker5th {
    return this._willpower;
  }

  get attributes(): Wod5AttributesData {
    return this._attributes;
  }

  get skills(): Wod5SkillsData {
    return this._skills;
  }

  /**
   * Applies superficial and/or aggravated damage to Health.
   *
   * @param damage - Object containing optional superficial and/or aggravated amounts
   */
  public takeHealthDamage(damage: {
    superficial?: number;
    aggravated?: number;
  }): void {
    if (damage.superficial) {
      this._health = this._health.takeSuperficial(damage.superficial);
    }
    if (damage.aggravated) {
      this._health = this._health.takeAggravated(damage.aggravated);
    }
  }

  /**
   * Heals superficial and/or aggravated damage from Health.
   *
   * @param heal - Object containing optional superficial and/or aggravated amounts to heal
   */
  public healHealthDamage(heal: {
    superficial?: number;
    aggravated?: number;
  }): void {
    if (heal.superficial) {
      this._health = this._health.healSuperficial(heal.superficial);
    }
    if (heal.aggravated) {
      this._health = this._health.healAggravated(heal.aggravated);
    }
  }

  /**
   * Sets superficial and/or aggravated damage on Health directly.
   *
   * @param damage - Object containing optional superficial and/or aggravated values
   */
  public setHealthDamage(damage: {
    superficial?: number;
    aggravated?: number;
  }): void {
    this._health = this._health.setDamage(damage);
  }

  /**
   * Applies superficial and/or aggravated damage to Willpower.
   *
   * @param damage - Object containing optional superficial and/or aggravated amounts
   */
  public takeWillpowerDamage(damage: {
    superficial?: number;
    aggravated?: number;
  }): void {
    if (damage.superficial) {
      this._willpower = this._willpower.takeSuperficial(damage.superficial);
    }
    if (damage.aggravated) {
      this._willpower = this._willpower.takeAggravated(damage.aggravated);
    }
  }

  /**
   * Heals superficial and/or aggravated damage from Willpower.
   *
   * @param heal - Object containing optional superficial and/or aggravated amounts to heal
   */
  public healWillpowerDamage(heal: {
    superficial?: number;
    aggravated?: number;
  }): void {
    if (heal.superficial) {
      this._willpower = this._willpower.healSuperficial(heal.superficial);
    }
    if (heal.aggravated) {
      this._willpower = this._willpower.healAggravated(heal.aggravated);
    }
  }

  /**
   * Sets superficial and/or aggravated damage on Willpower directly.
   *
   * @param damage - Object containing optional superficial and/or aggravated values
   */
  public setWillpowerDamage(damage: {
    superficial?: number;
    aggravated?: number;
  }): void {
    this._willpower = this._willpower.setDamage(damage);
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  override toData(): Character5thData {
    return {
      ...super.toData(),
      experience: {
        current: this._experience.current,
        total: this._experience.total,
      },
      health: {
        total: this._health.total,
        superficial: this._health.superficial,
        aggravated: this._health.aggravated,
      },
      willpower: {
        total: this._willpower.total,
        superficial: this._willpower.superficial,
        aggravated: this._willpower.aggravated,
      },
      attributes: this._attributes,
      skills: this._skills,
    };
  }
}
