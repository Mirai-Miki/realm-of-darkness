import type { Vampire5thData } from "@realm/common";
import type { IVampire5th } from "@realm/common";

import { Splat, RealmError } from "@realm/common";
import { Character5th } from "./character-5th.entity";
import { Humanity5thVO } from "./value-objects/humanity-5th.vo";

/**
 * Vampire 5th Edition character entity.
 * Implements V5-specific mechanics: Hunger, Blood Potency, Disciplines, etc.
 *
 * @remarks
 * This is a rich domain entity representing a Vampire: The Masquerade 5th Edition character.
 * It extends Character5th with vampire-specific behavior.
 *
 * Key V5 Vampire Mechanics:
 * - Hunger (0-5): Represents the Beast's need for blood
 * - Blood Potency: Determines feeding power and discipline strength
 * - Disciplines: Vampiric powers
 * - Clan: Vampire bloodline
 * - Generation: Distance from Caine
 *
 * This entity trusts that data passed to constructor is already validated at
 * boundaries (API/Bot edge, Repository edge). It only prevents internal
 * mutations that would violate business rules.
 */
export class Vampire5th extends Character5th implements IVampire5th {
  private _hunger: number;
  private _humanity: Humanity5thVO;
  private _bloodPotency: number;
  private _generation: number;

  constructor(data: Vampire5thData) {
    // Trust the data - already validated at boundary
    super(data);

    // Initialize from actual Data
    this._hunger = data.hunger;
    this._humanity = new Humanity5thVO(
      data.humanity ?? { total: 7, stains: 0 }
    );
    this._bloodPotency = data.bloodPotency ?? 0;
    this._generation = data.generation ?? 13;
  }

  // ============================================================================
  // Identity
  // ============================================================================

  override get splat(): typeof Splat.Vampire5th {
    return Splat.Vampire5th;
  }

  // ============================================================================
  // Hunger System
  // ============================================================================

  get hunger(): number {
    return this._hunger;
  }

  /**
   * Increase the vampire's Hunger.
   *
   * Hunger represents the Beast's need for blood.
   * Maximum Hunger is 5 (cannot exceed).
   *
   * @param amount - Amount to increase Hunger by (default: 1, must be >= 0)
   * @returns New Hunger value after increase
   * @throws {RealmError} If amount is negative
   *
   * @example
   * ```typescript
   * vampire.increaseHunger(); // Increase by 1
   * vampire.increaseHunger(2); // Increase by 2
   * ```
   */
  public increaseHunger(amount: number = 1): number {
    // Trust the data - already validated at boundary
    // Only check for impossible internal states
    if (amount < 0) {
      throw new RealmError("Cannot increase hunger by negative amount", {
        fields: { amount: amount.toString() },
      });
    }

    this._hunger = Math.min(5, this._hunger + amount);
    return this._hunger;
  }

  /**
   * Decrease the vampire's Hunger.
   *
   * Reduces Hunger by feeding.
   * Minimum Hunger is 1 (vampires can never reach Hunger 0).
   *
   * @param amount - Amount to decrease Hunger by (default: 1, must be >= 0)
   * @returns New Hunger value after decrease
   * @throws {RealmError} If amount is negative
   *
   * @example
   * ```typescript
   * vampire.decreaseHunger(); // Decrease by 1
   * vampire.decreaseHunger(2); // Decrease by 2
   * ```
   */
  public decreaseHunger(amount: number = 1): number {
    // Trust the data - already validated at boundary
    // Only check for impossible internal states
    if (amount < 0) {
      throw new RealmError("Cannot decrease hunger by negative amount", {
        fields: { amount: amount.toString() },
      });
    }

    // Vampires can never reach Hunger 0 (always at least 1)
    this._hunger = Math.max(1, this._hunger - amount);
    return this._hunger;
  }

  /**
   * Set the vampire's Hunger to a specific value.
   *
   * @param value - New Hunger value (0-5)
   * @returns New Hunger value
   * @throws {RealmError} If value is outside valid range (0-5)
   *
   * @example
   * ```typescript
   * vampire.setHunger(3); // Set Hunger to 3
   * ```
   */
  public setHunger(value: number): number {
    // Trust the data - already validated at boundary
    // Only check for impossible internal states
    if (value < 0 || value > 5) {
      throw new RealmError("Hunger must be between 0 and 5", {
        fields: { value: value.toString() },
      });
    }

    this._hunger = value;
    return this._hunger;
  }

  // ============================================================================
  // Humanity & Blood Potency
  // ============================================================================

  get humanity(): Humanity5thVO {
    return this._humanity;
  }

  get bloodPotency(): number {
    return this._bloodPotency;
  }

  set bloodPotency(value: number) {
    this._bloodPotency = Math.max(0, Math.min(10, value));
  }

  get generation(): number {
    return this._generation;
  }

  set generation(value: number) {
    this._generation = Math.max(1, Math.min(18, value));
  }

  public takeStains(amount: number): void {
    this._humanity = this._humanity.takeStains(amount);
  }

  public clearStains(amount?: number): void {
    this._humanity = this._humanity.clearStains(amount);
  }

  public setHumanity(total: number, stains?: number): void {
    this._humanity = this._humanity.setTotal(total);
    if (stains !== undefined) {
      this._humanity = this._humanity.setStains(stains);
    }
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  override toData(): Vampire5thData {
    return {
      ...super.toData(),
      splat: this.splat,
      hunger: this._hunger,
      humanity: {
        total: this._humanity.total,
        stains: this._humanity.stains,
      },
      bloodPotency: this._bloodPotency,
      generation: this._generation,
    };
  }
}
