import type { IHunter5th, Hunter5thData } from "@realm/common";
import { RealmError, Splat } from "@realm/common";
import { Character5th } from "./character-5th.entity";

/**
 * Hunter 5th Edition character entity.
 * Implements H5 mechanics: Desperation, Danger, and Despair.
 */
export class Hunter5th extends Character5th implements IHunter5th {
  private _desperation: number;
  private _danger: number;
  private _despair: boolean;

  constructor(data: Hunter5thData) {
    super(data);
    this._desperation = data.desperation;
    this._danger = data.danger;
    this._despair = data.despair;
  }

  override get splat(): typeof Splat.Hunter5th {
    return Splat.Hunter5th;
  }

  get desperation(): number {
    return this._desperation;
  }

  get danger(): number {
    return this._danger;
  }

  get despair(): boolean {
    return this._despair;
  }

  public setDesperation(value: number): void {
    if (value < 1 || value > 5) {
      throw new RealmError("Desperation must be between 1 and 5", {
        fields: { value: value.toString() },
      });
    }
    this._desperation = value;
  }

  public increaseDesperation(amount = 1): void {
    if (amount < 0) {
      throw new RealmError("Increase amount cannot be negative", {
        fields: { amount: amount.toString() },
      });
    }
    this._desperation = Math.min(5, this._desperation + amount);
  }

  public decreaseDesperation(amount = 1): void {
    if (amount < 0) {
      throw new RealmError("Decrease amount cannot be negative", {
        fields: { amount: amount.toString() },
      });
    }
    this._desperation = Math.max(1, this._desperation - amount);
  }

  public setDanger(value: number): void {
    if (value < 1 || value > 5) {
      throw new RealmError("Danger must be between 1 and 5", {
        fields: { value: value.toString() },
      });
    }
    this._danger = value;
  }

  public increaseDanger(amount = 1): void {
    if (amount < 0) {
      throw new RealmError("Increase amount cannot be negative", {
        fields: { amount: amount.toString() },
      });
    }
    this._danger = Math.min(5, this._danger + amount);
  }

  public decreaseDanger(amount = 1): void {
    if (amount < 0) {
      throw new RealmError("Decrease amount cannot be negative", {
        fields: { amount: amount.toString() },
      });
    }
    this._danger = Math.max(1, this._danger - amount);
  }

  public setDespair(value: boolean): void {
    this._despair = value;
  }

  override toData(): Hunter5thData {
    return {
      ...super.toData(),
      splat: this.splat,
      desperation: this._desperation,
      danger: this._danger,
      despair: this._despair,
    };
  }
}
