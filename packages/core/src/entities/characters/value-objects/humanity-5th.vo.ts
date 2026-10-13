import type { Humanity5thData } from "@realm/common";
import { RealmError } from "@realm/common";

/**
 * 5th Edition Humanity and Stains Value Object.
 *
 * @remarks
 * In Vampire: The Masquerade 5th Edition:
 * - Humanity ranges from 0 to 10.
 * - Stains accumulate from right to left in the 10 boxes (boxes 10 down to total + 1).
 * - Empty boxes available for stains = (10 - total).
 * - When stains exceed available empty boxes, each excess point causes Degeneration
 *   (and 1 Aggravated Willpower damage).
 *
 * Immutable - all state mutation operations return new instances.
 */
export class Humanity5thVO implements Humanity5thData {
  readonly total: number;
  readonly stains: number;

  constructor(data: Humanity5thData) {
    this.total = Math.max(0, Math.min(10, data.total));
    this.stains = Math.max(0, Math.min(10, data.stains));
  }

  /**
   * Number of undamaged/empty boxes between Humanity rating and Stains.
   */
  public get emptyBoxes(): number {
    return Math.max(0, 10 - this.total - this.stains);
  }

  /**
   * Calculates the number of stains overflowing beyond available boxes.
   */
  public get degenerationOverflow(): number {
    const available = 10 - this.total;
    return Math.max(0, this.stains - available);
  }

  /**
   * True if character is currently suffering from stain overflow / degeneration.
   */
  public isDegenerating(): boolean {
    return this.degenerationOverflow > 0;
  }

  /**
   * Takes additional stains.
   *
   * @param amount - Number of stains to acquire
   * @returns A new Humanity5thVO instance
   */
  public takeStains(amount: number): Humanity5thVO {
    if (amount < 0) {
      throw new RealmError("Stain amount cannot be negative", {
        fields: { amount: amount.toString() },
      });
    }

    return new Humanity5thVO({
      total: this.total,
      stains: Math.min(10, this.stains + amount),
    });
  }

  /**
   * Clears or reduces stains (e.g. after a remorse check).
   *
   * @param amount - Number of stains to clear, or undefined to clear all
   * @returns A new Humanity5thVO instance
   */
  public clearStains(amount?: number): Humanity5thVO {
    if (amount === undefined) {
      return new Humanity5thVO({ total: this.total, stains: 0 });
    }

    if (amount < 0) {
      throw new RealmError("Clear amount cannot be negative", {
        fields: { amount: amount.toString() },
      });
    }

    return new Humanity5thVO({
      total: this.total,
      stains: Math.max(0, this.stains - amount),
    });
  }

  /**
   * Sets the permanent Humanity rating. If humanity decreases, stains are reset as per V5 rules.
   *
   * @param total - New humanity rating (0-10)
   * @returns A new Humanity5thVO instance
   */
  public setTotal(total: number): Humanity5thVO {
    if (total < 0 || total > 10) {
      throw new RealmError("Humanity rating must be between 0 and 10", {
        fields: { total: total.toString() },
      });
    }

    // Reset stains if losing humanity
    const newStains = total < this.total ? 0 : this.stains;

    return new Humanity5thVO({
      total,
      stains: newStains,
    });
  }

  /**
   * Sets stains directly.
   *
   * @param stains - Number of stains (0-10)
   * @returns A new Humanity5thVO instance
   */
  public setStains(stains: number): Humanity5thVO {
    if (stains < 0 || stains > 10) {
      throw new RealmError("Stains must be between 0 and 10", {
        fields: { stains: stains.toString() },
      });
    }

    return new Humanity5thVO({
      total: this.total,
      stains,
    });
  }
}
