import type {
  ConsumableTrackerData,
  CounterTrackerData,
  Demon20thData,
  IDemon20th,
} from "@realm/common";
import { Splat } from "@realm/common";
import { Character20th } from "./character-20th.entity";
import { ConsumableTrackerVO } from "./value-objects/consumable-tracker.vo";
import { CounterTrackerVO } from "./value-objects/counter-tracker.vo";

/**
 * Demon 20th Anniversary Edition (Demon: The Fallen) character entity.
 * Implements mechanics: Faith and Torment (Permanent & Temporary).
 */
export class Demon20th extends Character20th implements IDemon20th {
  private _faith: ConsumableTrackerVO;
  private _torment: CounterTrackerVO;

  constructor(data: Demon20thData) {
    super(data);
    this._faith = new ConsumableTrackerVO({
      total: data.faith.total,
      current: data.faith.current,
      min: 0,
    });
    this._torment = new CounterTrackerVO({
      permanent: data.torment.permanent,
      temporary: data.torment.temporary,
      max: 10,
    });
  }

  override get splat(): typeof Splat.Demon20th {
    return Splat.Demon20th;
  }

  get faith(): ConsumableTrackerData {
    return {
      total: this._faith.total,
      current: this._faith.current,
    };
  }

  get torment(): CounterTrackerData {
    return {
      permanent: this._torment.permanent,
      temporary: this._torment.temporary,
    };
  }

  public spendFaith(amount = 1): void {
    this._faith = this._faith.spend(amount);
  }

  public gainFaith(amount = 1): void {
    this._faith = this._faith.gain(amount);
  }

  public setFaith(current: number, total?: number): void {
    if (total !== undefined) {
      this._faith = this._faith.setTotal(total, false);
    }
    this._faith = this._faith.setCurrent(current);
  }

  public gainTorment(temporary = 1): void {
    this._torment = this._torment.gainTemporary(temporary);
  }

  public setTorment(permanent: number, temporary?: number): void {
    this._torment = this._torment.setPermanent(permanent);
    if (temporary !== undefined) {
      this._torment = this._torment.setTemporary(temporary);
    }
  }

  override toData(): Demon20thData {
    return {
      ...super.toData(),
      splat: this.splat,
      faith: {
        total: this._faith.total,
        current: this._faith.current,
      },
      torment: {
        permanent: this._torment.permanent,
        temporary: this._torment.temporary,
      },
    };
  }
}
