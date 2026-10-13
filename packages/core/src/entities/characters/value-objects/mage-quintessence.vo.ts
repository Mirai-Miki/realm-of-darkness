import type { QuintessenceParadoxData } from "@realm/common";
import { RealmError } from "@realm/common";

/**
 * Mage 20th Edition Quintessence and Paradox Value Object.
 *
 * @remarks
 * In Mage: The Ascension 20th Anniversary Edition:
 * - Quintessence and Paradox share a 20-box wheel/bar.
 * - The fundamental constraint is: quintessence + paradox <= 20.
 * - Accumulating Paradox pushes down the maximum possible Quintessence a mage can store.
 * - If Paradox increases to a point where quintessence + paradox > 20, Quintessence is
 *   automatically reduced/pushed out to (20 - paradox).
 *
 * Immutable - all state mutation operations return new instances.
 */
export class MageQuintessenceVO implements QuintessenceParadoxData {
  readonly quintessence: number;
  readonly paradox: number;
  public static readonly MAX_POOL = 20;

  constructor(data: QuintessenceParadoxData) {
    if (data.quintessence + data.paradox > MageQuintessenceVO.MAX_POOL) {
      throw new RealmError(
        "Combined Quintessence and Paradox cannot exceed 20",
        {
          fields: {
            quintessence: data.quintessence.toString(),
            paradox: data.paradox.toString(),
          },
        }
      );
    }

    this.quintessence = Math.max(0, data.quintessence);
    this.paradox = Math.max(0, data.paradox);
  }

  /**
   * Maximum Quintessence capacity allowed by current Paradox level.
   */
  public get maxQuintessence(): number {
    return Math.max(0, MageQuintessenceVO.MAX_POOL - this.paradox);
  }

  /**
   * Spends Quintessence.
   *
   * @param amount - Amount of Quintessence to spend
   * @returns New MageQuintessenceVO instance
   */
  public spendQuintessence(amount = 1): MageQuintessenceVO {
    if (amount <= 0) {
      throw new RealmError("Spend amount must be greater than zero", {
        fields: { amount: amount.toString() },
      });
    }

    if (this.quintessence < amount) {
      throw new RealmError("Insufficient Quintessence points", {
        fields: {
          current: this.quintessence.toString(),
          spendAmount: amount.toString(),
        },
      });
    }

    return new MageQuintessenceVO({
      quintessence: this.quintessence - amount,
      paradox: this.paradox,
    });
  }

  /**
   * Channels or absorbs Quintessence into avatar pool.
   * Capped by (20 - paradox).
   *
   * @param amount - Amount of Quintessence to gain
   * @returns New MageQuintessenceVO instance
   */
  public gainQuintessence(amount = 1): MageQuintessenceVO {
    if (amount <= 0) {
      throw new RealmError("Gain amount must be greater than zero", {
        fields: { amount: amount.toString() },
      });
    }

    const newQuint = Math.min(this.maxQuintessence, this.quintessence + amount);

    return new MageQuintessenceVO({
      quintessence: newQuint,
      paradox: this.paradox,
    });
  }

  /**
   * Gains Paradox from vulgar magick or botches.
   * If new paradox pushes quintessence + paradox > 20, Quintessence is compressed down.
   *
   * @param amount - Amount of Paradox gained
   * @returns New MageQuintessenceVO instance
   */
  public gainParadox(amount = 1): MageQuintessenceVO {
    if (amount <= 0) {
      throw new RealmError("Paradox gain amount must be greater than zero", {
        fields: { amount: amount.toString() },
      });
    }

    const newParadox = Math.min(
      MageQuintessenceVO.MAX_POOL,
      this.paradox + amount
    );
    const newQuint = Math.min(
      MageQuintessenceVO.MAX_POOL - newParadox,
      this.quintessence
    );

    return new MageQuintessenceVO({
      quintessence: newQuint,
      paradox: newParadox,
    });
  }

  /**
   * Discharges or burns off Paradox (e.g. through paradox backlash or quiet).
   *
   * @param amount - Amount of Paradox to discharge
   * @returns New MageQuintessenceVO instance
   */
  public dischargeParadox(amount = 1): MageQuintessenceVO {
    if (amount <= 0) {
      throw new RealmError("Discharge amount must be greater than zero", {
        fields: { amount: amount.toString() },
      });
    }

    const newParadox = Math.max(0, this.paradox - amount);

    return new MageQuintessenceVO({
      quintessence: this.quintessence,
      paradox: newParadox,
    });
  }
}
