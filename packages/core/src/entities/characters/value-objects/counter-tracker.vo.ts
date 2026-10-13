import type { CounterTrackerData } from "@realm/common";
import { RealmError } from "@realm/common";

/**
 * Options for configuring a CounterTrackerVO.
 */
export interface CounterTrackerOptions {
  permanent?: number;
  temporary?: number;
  max?: number;
}

/**
 * Dual Permanent/Temporary Counter Value Object.
 * Used by Changeling (Banality, Nightmare/Imbalance) and Demon (Torment).
 *
 * @remarks
 * In World of Darkness 20th Anniversary mechanics:
 * - A counter has a permanent rating (primary) and a temporary rating (secondary).
 * - When temporary points reach or exceed `max` (typically 10), each full block of 10
 *   increments the permanent rating by 1 (capped at max 10), and the remainder remains in temporary.
 *
 * Immutable - all state mutation operations return new instances.
 */
export class CounterTrackerVO implements CounterTrackerData {
  readonly permanent: number;
  readonly temporary: number;
  readonly max: number;

  constructor(options: CounterTrackerOptions = {}) {
    this.max = options.max ?? 10;
    this.permanent = Math.max(0, Math.min(this.max, options.permanent ?? 0));
    this.temporary = Math.max(
      0,
      Math.min(this.max - 1, options.temporary ?? 0)
    );
  }

  /**
   * Adds temporary points to the counter.
   * If accumulated points reach or exceed `max`, the permanent rating is automatically
   * incremented by +1 per block of `max` and temporary holds the remainder.
   *
   * @param amount - Number of temporary points to gain
   * @returns New CounterTrackerVO instance with updated permanent and temporary values
   */
  public gainTemporary(amount = 1): CounterTrackerVO {
    if (amount < 0) {
      throw new RealmError("Gain amount cannot be negative", {
        fields: { amount: amount.toString() },
      });
    }

    const totalTemp = this.temporary + amount;
    const permanentIncrements = Math.floor(totalTemp / this.max);
    const remainder = totalTemp % this.max;

    const newPermanent = Math.min(
      this.max,
      this.permanent + permanentIncrements
    );

    return new CounterTrackerVO({
      permanent: newPermanent,
      temporary: remainder,
      max: this.max,
    });
  }

  /**
   * Reduces temporary points.
   *
   * @param amount - Number of temporary points to remove
   * @returns New CounterTrackerVO instance
   */
  public loseTemporary(amount = 1): CounterTrackerVO {
    if (amount < 0) {
      throw new RealmError("Lose amount cannot be negative", {
        fields: { amount: amount.toString() },
      });
    }

    return new CounterTrackerVO({
      permanent: this.permanent,
      temporary: Math.max(0, this.temporary - amount),
      max: this.max,
    });
  }

  /**
   * Sets the permanent rating directly.
   *
   * @param value - New permanent rating (0-max)
   * @returns New CounterTrackerVO instance
   */
  public setPermanent(value: number): CounterTrackerVO {
    if (value < 0 || value > this.max) {
      throw new RealmError("Permanent rating out of bounds", {
        fields: { value: value.toString(), max: this.max.toString() },
      });
    }

    return new CounterTrackerVO({
      permanent: value,
      temporary: this.temporary,
      max: this.max,
    });
  }

  /**
   * Sets the temporary rating directly.
   *
   * @param value - New temporary rating (0 to max-1)
   * @returns New CounterTrackerVO instance
   */
  public setTemporary(value: number): CounterTrackerVO {
    if (value < 0) {
      throw new RealmError("Temporary rating cannot be negative", {
        fields: { value: value.toString() },
      });
    }

    if (value >= this.max) {
      return this.gainTemporary(value - this.temporary);
    }

    return new CounterTrackerVO({
      permanent: this.permanent,
      temporary: value,
      max: this.max,
    });
  }
}
