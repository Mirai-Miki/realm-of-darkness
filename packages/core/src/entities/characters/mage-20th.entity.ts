import type {
  IMage20th,
  Mage20thData,
  QuintessenceParadoxData,
} from "@realm/common";
import { RealmError, Splat } from "@realm/common";
import { Character20th } from "./character-20th.entity";
import { MageQuintessenceVO } from "./value-objects/mage-quintessence.vo";

/**
 * Mage 20th Anniversary Edition character entity.
 * Implements M20 mechanics: Arete and the combined Quintessence/Paradox wheel.
 */
export class Mage20th extends Character20th implements IMage20th {
  private _arete: number;
  private _quintessence: MageQuintessenceVO;

  constructor(data: Mage20thData) {
    super(data);
    this._arete = data.arete;
    this._quintessence = new MageQuintessenceVO(data.quintessence);
  }

  override get splat(): typeof Splat.Mage20th {
    return Splat.Mage20th;
  }

  get arete(): number {
    return this._arete;
  }

  get quintessence(): QuintessenceParadoxData {
    return {
      quintessence: this._quintessence.quintessence,
      paradox: this._quintessence.paradox,
    };
  }

  public setArete(value: number): void {
    if (value < 0 || value > 10) {
      throw new RealmError("Arete must be between 0 and 10", {
        fields: { value: value.toString() },
      });
    }
    this._arete = value;
  }

  public spendQuintessence(amount = 1): void {
    this._quintessence = this._quintessence.spendQuintessence(amount);
  }

  public gainQuintessence(amount = 1): void {
    this._quintessence = this._quintessence.gainQuintessence(amount);
  }

  public gainParadox(amount = 1): void {
    this._quintessence = this._quintessence.gainParadox(amount);
  }

  public dischargeParadox(amount = 1): void {
    this._quintessence = this._quintessence.dischargeParadox(amount);
  }

  public setQuintessenceAndParadox(
    quintessence: number,
    paradox: number
  ): void {
    this._quintessence = new MageQuintessenceVO({ quintessence, paradox });
  }

  override toData(): Mage20thData {
    return {
      ...super.toData(),
      splat: this.splat,
      arete: this._arete,
      quintessence: {
        quintessence: this._quintessence.quintessence,
        paradox: this._quintessence.paradox,
      },
    };
  }
}
