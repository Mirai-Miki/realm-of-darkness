import type {
  BaseCharacterData,
  ICharacter,
  IVampire5th,
  IVampire20th,
  IExperience,
  Snowflake,
  CharacterStatus,
} from "@realm/common";

import { RealmError, Splat } from "@realm/common";
import { Experience } from "./value-objects/experience.vo";

/**
 * Base Character entity.
 * Pure domain model with business logic for all character types.
 *
 * @remarks
 * This is a rich domain entity that wraps Data and provides
 * business logic methods. It contains NO database code, NO framework code.
 *
 * All character-specific behavior is implemented in subclasses (Character5th,
 * Character20th, Vampire5th, etc.).
 *
 * This entity trusts that data passed to constructor is already validated at
 * boundaries (API/Bot edge, Repository edge). It only prevents internal
 * mutations that would violate business rules.
 */
export abstract class Character implements ICharacter {
  protected data: BaseCharacterData;
  protected _experience: IExperience;

  constructor(data: BaseCharacterData) {
    // Trust the data - already validated at boundary
    this.data = data;

    // Initialize experience value object from data if provided
    const expData = (
      data as { experience?: { current: number; total: number } }
    ).experience;
    this._experience = new Experience({
      current: expData?.current ?? 0,
      total: expData?.total ?? 0,
    });
  }

  // ============================================================================
  // Identity Getters (Read-Only)
  // ============================================================================

  get id(): Snowflake {
    return this.data.id;
  }

  get userId(): Snowflake {
    return this.data.userId;
  }

  abstract get splat(): Splat;

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get lastUpdated(): Date {
    return this.data.lastUpdated;
  }

  // ============================================================================
  // Mutable Properties
  // ============================================================================

  get name(): string {
    return this.data.name;
  }

  set name(value: string) {
    this.data.name = value;
  }

  get chronicleId(): Snowflake | null {
    return this.data.chronicleId;
  }

  set chronicleId(value: Snowflake | null) {
    this.data.chronicleId = value;
  }

  get status(): CharacterStatus {
    return this.data.status;
  }

  set status(value: CharacterStatus) {
    this.data.status = value;
  }

  get avatarUrl(): string | null {
    return this.data.avatarUrl;
  }

  set avatarUrl(value: string | null) {
    this.data.avatarUrl = value;
  }

  get themeColor(): string {
    return this.data.themeColor;
  }

  set themeColor(value: string) {
    this.data.themeColor = value;
  }

  // ============================================================================
  // Experience (Value Object)
  // ============================================================================

  get experience(): IExperience {
    return this._experience;
  }

  /**
   * Check if character has enough unspent experience for a purchase.
   *
   * @param cost - Experience cost of the purchase
   * @returns True if character has enough unspent XP
   *
   * @example
   * ```typescript
   * if (character.canAffordExperience(10)) {
   *   character.spendExperience(10);
   * }
   * ```
   */
  public canAffordExperience(cost: number): boolean {
    return this._experience.canAfford(cost);
  }

  /**
   * Spend experience points on character improvements.
   *
   * Reduces current (unspent) experience. Total experience remains unchanged.
   *
   * @param cost - Amount of experience to spend
   * @throws {RealmError} If character doesn't have enough unspent XP
   *
   * @example
   * ```typescript
   * character.spendExperience(5); // Buy a trait costing 5 XP
   * ```
   */
  public spendExperience(cost: number): void {
    if (!this.canAffordExperience(cost)) {
      throw new RealmError(
        "Attempted to spend more experience than available",
        {
          fields: {
            cost: cost.toString(),
            current: this._experience.current.toString(),
          },
        }
      );
    }
    this._experience = this._experience.spend(cost);
  }

  /**
   * Award experience points to the character.
   *
   * Increases both current (unspent) and total experience.
   * Called when character earns XP from gameplay.
   *
   * @param amount - Amount of experience to award
   * @throws {RealmError} If amount is negative
   *
   * @example
   * ```typescript
   * character.awardExperience(3); // Award 3 XP for session attendance
   * ```
   */
  public awardExperience(amount: number): void {
    this._experience = this._experience.award(amount);
  }

  /**
   * Set the total experience for the character.
   *
   * Used for character creation or adjustments.
   * If new total is less than current, current is capped to new total.
   *
   * @param total - New total experience value
   * @throws {RealmError} If total is negative
   *
   * @example
   * ```typescript
   * character.setExperienceTotal(100); // Set total XP to 100
   * ```
   */
  public setExperienceTotal(total: number): void {
    this._experience = this._experience.setTotal(total);
  }

  /**
   * Set the current (unspent) experience for the character.
   *
   * Used for adjustments or corrections.
   * Total experience remains unchanged.
   *
   * @param current - New current experience value (must be 0 <= current <= total)
   * @throws {RealmError} If current is negative or exceeds total
   *
   * @example
   * ```typescript
   * character.setExperienceCurrent(15); // Set unspent XP to 15
   * ```
   */
  public setExperienceCurrent(current: number): void {
    this._experience = this._experience.setCurrent(current);
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Convert entity to plain data object for persistence.
   *
   * @returns Plain BaseCharacterData object
   *
   * @example
   * ```typescript
   * const data = character.toData();
   * await repository.update(data);
   * ```
   */
  public toData(): BaseCharacterData {
    return {
      ...this.data,
    };
  }
  // ============================================================================
  // Type Guards
  // ============================================================================

  /**
   * Check if character is a 5th Edition Vampire.
   */
  public isVampire5th(): this is IVampire5th {
    return this.splat === Splat.Vampire5th;
  }

  /**
   * Check if character is a 20th Anniversary Vampire.
   */
  public isVampire20th(): this is IVampire20th {
    return this.splat === Splat.Vampire20th;
  }
}
