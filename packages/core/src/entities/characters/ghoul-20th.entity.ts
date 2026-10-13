import type { Ghoul20thData, IGhoul20th } from "@realm/common";
import { RealmError, Splat } from "@realm/common";
import { Character20th } from "./character-20th.entity";

/**
 * Ghoul 20th Anniversary Edition character entity.
 * Implements blood pool (10), vampire vitae (0-5), and humanity (0-10).
 */
export class Ghoul20th extends Character20th implements IGhoul20th {
  private _blood: number;
  private _vitae: number;
  private _humanity: number;

  constructor(data: Ghoul20thData) {
    super(data);
    this._blood = data.blood;
    this._vitae = data.vitae;
    this._humanity = data.humanity;
  }

  override get splat(): typeof Splat.Ghoul20th {
    return Splat.Ghoul20th;
  }

  get blood(): number {
    return this._blood;
  }

  get vitae(): number {
    return this._vitae;
  }

  get humanity(): number {
    return this._humanity;
  }

  public setBlood(value: number): void {
    if (value < 0 || value > 10) {
      throw new RealmError("Blood must be between 0 and 10", {
        fields: { value: value.toString() },
      });
    }
    this._blood = value;
  }

  public setVitae(value: number): void {
    if (value < 0 || value > 5) {
      throw new RealmError("Vitae must be between 0 and 5", {
        fields: { value: value.toString() },
      });
    }
    this._vitae = value;
  }

  public spendVitae(amount = 1): void {
    if (amount <= 0) {
      throw new RealmError("Spend amount must be greater than zero", {
        fields: { amount: amount.toString() },
      });
    }
    if (this._vitae < amount) {
      throw new RealmError("Insufficient vitae", {
        fields: {
          current: this._vitae.toString(),
          spendAmount: amount.toString(),
        },
      });
    }
    this._vitae -= amount;
  }

  public gainVitae(amount = 1): void {
    if (amount <= 0) {
      throw new RealmError("Gain amount must be greater than zero", {
        fields: { amount: amount.toString() },
      });
    }
    this._vitae = Math.min(5, this._vitae + amount);
  }

  public setHumanity(value: number): void {
    if (value < 0 || value > 10) {
      throw new RealmError("Humanity must be between 0 and 10", {
        fields: { value: value.toString() },
      });
    }
    this._humanity = value;
  }

  override toData(): Ghoul20thData {
    return {
      ...super.toData(),
      splat: this.splat,
      blood: this._blood,
      vitae: this._vitae,
      humanity: this._humanity,
    };
  }
}
