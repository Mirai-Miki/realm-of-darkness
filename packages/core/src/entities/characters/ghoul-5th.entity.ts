import type { IGhoul5th, Ghoul5thData, Humanity5thData } from "@realm/common";
import { Splat } from "@realm/common";
import { Character5th } from "./character-5th.entity";
import { Humanity5thVO } from "./value-objects/humanity-5th.vo";

/**
 * Ghoul 5th Edition character entity.
 * Uses Humanity and Stains tracker.
 */
export class Ghoul5th extends Character5th implements IGhoul5th {
  private _humanity: Humanity5thVO;

  constructor(data: Ghoul5thData) {
    super(data);
    this._humanity = new Humanity5thVO(data.humanity);
  }

  override get splat(): typeof Splat.Ghoul5th {
    return Splat.Ghoul5th;
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

  override toData(): Ghoul5thData {
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
