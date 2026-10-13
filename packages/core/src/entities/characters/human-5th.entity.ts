import type { IHuman5th, Human5thData, Humanity5thData } from "@realm/common";
import { Splat } from "@realm/common";
import { Character5th } from "./character-5th.entity";
import { Humanity5thVO } from "./value-objects/humanity-5th.vo";

/**
 * Human 5th Edition character entity.
 * Uses Humanity and Stains tracker for mortals.
 */
export class Human5th extends Character5th implements IHuman5th {
  private _humanity: Humanity5thVO;

  constructor(data: Human5thData) {
    super(data);
    this._humanity = new Humanity5thVO(data.humanity);
  }

  override get splat(): typeof Splat.Human5th {
    return Splat.Human5th;
  }

  get humanity(): Humanity5thData {
    return {
      total: this._humanity.total,
      stains: this._humanity.stains,
    };
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

  override toData(): Human5thData {
    return {
      ...super.toData(),
      splat: this.splat,
      humanity: {
        total: this._humanity.total,
        stains: this._humanity.stains,
      },
    };
  }
}
