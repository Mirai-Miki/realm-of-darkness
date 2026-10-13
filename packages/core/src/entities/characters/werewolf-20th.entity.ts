import type {
  ConsumableTrackerData,
  IWerewolf20th,
  UnlockedConsumableTrackerData,
  Werewolf20thData,
} from "@realm/common";
import { Splat } from "@realm/common";
import { Character20th } from "./character-20th.entity";
import { ConsumableTrackerVO } from "./value-objects/consumable-tracker.vo";

/**
 * Werewolf 20th Anniversary Edition character entity.
 * Implements W20 mechanics: Rage (unlocked up to 10) and Gnosis.
 */
export class Werewolf20th extends Character20th implements IWerewolf20th {
  private _rage: ConsumableTrackerVO;
  private _gnosis: ConsumableTrackerVO;

  constructor(data: Werewolf20thData) {
    super(data);
    this._rage = new ConsumableTrackerVO({
      total: data.rage.total,
      current: data.rage.current,
      min: 0,
      unlockedMax: 10,
    });
    this._gnosis = new ConsumableTrackerVO({
      total: data.gnosis.total,
      current: data.gnosis.current,
      min: 0,
    });
  }

  override get splat(): typeof Splat.Werewolf20th {
    return Splat.Werewolf20th;
  }

  get rage(): UnlockedConsumableTrackerData {
    return {
      total: this._rage.total,
      current: this._rage.current,
    };
  }

  get gnosis(): ConsumableTrackerData {
    return {
      total: this._gnosis.total,
      current: this._gnosis.current,
    };
  }

  public spendRage(amount = 1): void {
    this._rage = this._rage.spend(amount);
  }

  public gainRage(amount = 1): void {
    this._rage = this._rage.gain(amount);
  }

  public setRage(current: number, total?: number): void {
    if (total !== undefined) {
      this._rage = this._rage.setTotal(total, false);
    }
    this._rage = this._rage.setCurrent(current);
  }

  public spendGnosis(amount = 1): void {
    this._gnosis = this._gnosis.spend(amount);
  }

  public gainGnosis(amount = 1): void {
    this._gnosis = this._gnosis.gain(amount);
  }

  public setGnosis(current: number, total?: number): void {
    if (total !== undefined) {
      this._gnosis = this._gnosis.setTotal(total, false);
    }
    this._gnosis = this._gnosis.setCurrent(current);
  }

  override toData(): Werewolf20thData {
    return {
      ...super.toData(),
      splat: this.splat,
      rage: {
        total: this._rage.total,
        current: this._rage.current,
      },
      gnosis: {
        total: this._gnosis.total,
        current: this._gnosis.current,
      },
    };
  }
}
