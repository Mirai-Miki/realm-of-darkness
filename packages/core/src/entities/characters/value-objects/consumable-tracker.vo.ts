import type { ConsumableTrackerData } from "@realm/common";
import { RealmError } from "@realm/common";

/**
 * Options for configuring a ConsumableTrackerVO.
 */
export interface ConsumableTrackerOptions {
  total: number;
  current?: number;
  min?: number;
  unlockedMax?: number;
}

/**
 * Generic Consumable Tracker Value Object.
 * Represents resource pools such as Willpower, Blood, Faith, Glamour, Corpus, and Gnosis.
 *
 * Immutable - all state mutation operations return new instances.
 */
export class ConsumableTrackerVO implements ConsumableTrackerData {
  readonly total: number;
  readonly current: number;
  readonly min: number;
  readonly unlockedMax?: number;

  constructor(options: ConsumableTrackerOptions) {
    this.total = Math.max(0, options.total);
    this.min = Math.max(0, options.min ?? 0);
    this.unlockedMax = options.unlockedMax;

    const initialCurrent = options.current ?? this.total;
    const maxBound = this.unlockedMax ?? this.total;

    this.current = Math.max(this.min, Math.min(maxBound, initialCurrent));
  }

  /**
   * Spend an amount from the current pool.
   *
   * @param amount - Amount to spend (must be > 0)
   * @returns New ConsumableTrackerVO instance
   * @throws {RealmError} If pool does not have sufficient resources or amount is negative
   */
  public spend(amount = 1): ConsumableTrackerVO {
    if (amount <= 0) {
      throw new RealmError("Spend amount must be greater than zero", {
        fields: { amount: amount.toString() },
      });
    }

    if (this.current - amount < this.min) {
      throw new RealmError("Insufficient consumable pool points", {
        fields: {
          current: this.current.toString(),
          spendAmount: amount.toString(),
          min: this.min.toString(),
        },
      });
    }

    return new ConsumableTrackerVO({
      total: this.total,
      current: this.current - amount,
      min: this.min,
      unlockedMax: this.unlockedMax,
    });
  }

  /**
   * Restore/gain points into the consumable pool.
   *
   * @param amount - Amount to gain (must be > 0)
   * @returns New ConsumableTrackerVO instance
   * @throws {RealmError} If amount is negative
   */
  public gain(amount = 1): ConsumableTrackerVO {
    if (amount <= 0) {
      throw new RealmError("Gain amount must be greater than zero", {
        fields: { amount: amount.toString() },
      });
    }

    const maxBound = this.unlockedMax ?? this.total;
    const newCurrent = Math.min(maxBound, this.current + amount);

    return new ConsumableTrackerVO({
      total: this.total,
      current: newCurrent,
      min: this.min,
      unlockedMax: this.unlockedMax,
    });
  }

  /**
   * Directly sets the current pool value within valid bounds.
   *
   * @param value - New current value
   * @returns New ConsumableTrackerVO instance
   */
  public setCurrent(value: number): ConsumableTrackerVO {
    const maxBound = this.unlockedMax ?? this.total;
    const clamped = Math.max(this.min, Math.min(maxBound, value));

    return new ConsumableTrackerVO({
      total: this.total,
      current: clamped,
      min: this.min,
      unlockedMax: this.unlockedMax,
    });
  }

  /**
   * Sets the permanent total capacity of the pool.
   *
   * @param total - New total capacity
   * @param adjustCurrent - If true, scales/caps current to new total if exceeded
   * @returns New ConsumableTrackerVO instance
   */
  public setTotal(total: number, adjustCurrent = true): ConsumableTrackerVO {
    if (total < this.min) {
      throw new RealmError(
        "Total capacity cannot be less than minimum pool rating",
        {
          fields: { total: total.toString(), min: this.min.toString() },
        }
      );
    }

    const maxBound = this.unlockedMax ?? total;
    const newCurrent = adjustCurrent
      ? Math.min(maxBound, this.current)
      : this.current;

    return new ConsumableTrackerVO({
      total,
      current: newCurrent,
      min: this.min,
      unlockedMax: this.unlockedMax,
    });
  }
}
