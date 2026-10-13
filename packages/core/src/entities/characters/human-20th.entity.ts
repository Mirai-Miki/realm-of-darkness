import type { Human20thData, IHuman20th } from "@realm/common";
import { RealmError, Splat } from "@realm/common";
import { Character20th } from "./character-20th.entity";

/**
 * Human 20th Anniversary Edition character entity.
 * Implements blood pool (10) and humanity (0-10).
 */
export class Human20th extends Character20th implements IHuman20th {
  private _blood: number;
  private _humanity: number;

  constructor(data: Human20thData) {
    super(data);
    this._blood = data.blood;
    this._humanity = data.humanity;
  }

  override get splat(): typeof Splat.Human20th {
    return Splat.Human20th;
  }

  get blood(): number {
    return this._blood;
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

  public setHumanity(value: number): void {
    if (value < 0 || value > 10) {
      throw new RealmError("Humanity must be between 0 and 10", {
        fields: { value: value.toString() },
      });
    }
    this._humanity = value;
  }

  override toData(): Human20thData {
    return {
      ...super.toData(),
      splat: this.splat,
      blood: this._blood,
      humanity: this._humanity,
    };
  }
}
