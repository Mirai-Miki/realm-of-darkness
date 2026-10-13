import type {
  Changeling20thData,
  ConsumableTrackerData,
  CounterTrackerData,
  HealthTracker20thData,
  IChangeling20th,
} from "@realm/common";
import { Splat } from "@realm/common";
import { Character20th } from "./character-20th.entity";
import { ConsumableTrackerVO } from "./value-objects/consumable-tracker.vo";
import { CounterTrackerVO } from "./value-objects/counter-tracker.vo";
import { HealthTracker20th } from "./value-objects/health-tracker-20th.vo";

/**
 * Changeling 20th Anniversary Edition character entity.
 * Implements C20 mechanics: Glamour, Banality, Nightmare/Imbalance, and Chimerical Health.
 */
export class Changeling20th extends Character20th implements IChangeling20th {
  private _glamour: ConsumableTrackerVO;
  private _banality: CounterTrackerVO;
  private _nightmare: CounterTrackerVO;
  private _chimericalHealth: HealthTracker20th;

  constructor(data: Changeling20thData) {
    super(data);
    this._glamour = new ConsumableTrackerVO({
      total: data.glamour.total,
      current: data.glamour.current,
      min: 1,
    });
    this._banality = new CounterTrackerVO({
      permanent: data.banality.permanent,
      temporary: data.banality.temporary,
      max: 10,
    });
    this._nightmare = new CounterTrackerVO({
      permanent: data.nightmare.permanent,
      temporary: data.nightmare.temporary,
      max: 10,
    });
    this._chimericalHealth = new HealthTracker20th(data.chimericalHealth);
  }

  override get splat(): typeof Splat.Changeling20th {
    return Splat.Changeling20th;
  }

  get glamour(): ConsumableTrackerData {
    return {
      total: this._glamour.total,
      current: this._glamour.current,
    };
  }

  get banality(): CounterTrackerData {
    return {
      permanent: this._banality.permanent,
      temporary: this._banality.temporary,
    };
  }

  get nightmare(): CounterTrackerData {
    return {
      permanent: this._nightmare.permanent,
      temporary: this._nightmare.temporary,
    };
  }

  get chimericalHealth(): HealthTracker20thData {
    return {
      total: this._chimericalHealth.total,
      bashing: this._chimericalHealth.bashing,
      lethal: this._chimericalHealth.lethal,
      aggravated: this._chimericalHealth.aggravated,
    };
  }

  public spendGlamour(amount = 1): void {
    this._glamour = this._glamour.spend(amount);
  }

  public gainGlamour(amount = 1): void {
    this._glamour = this._glamour.gain(amount);
  }

  public setGlamour(current: number, total?: number): void {
    if (total !== undefined) {
      this._glamour = this._glamour.setTotal(total, false);
    }
    this._glamour = this._glamour.setCurrent(current);
  }

  public gainBanality(temporary = 1): void {
    this._banality = this._banality.gainTemporary(temporary);
  }

  public setBanality(permanent: number, temporary?: number): void {
    this._banality = this._banality.setPermanent(permanent);
    if (temporary !== undefined) {
      this._banality = this._banality.setTemporary(temporary);
    }
  }

  public gainNightmare(temporary = 1): void {
    this._nightmare = this._nightmare.gainTemporary(temporary);
  }

  public setNightmare(imbalance: number, nightmare?: number): void {
    this._nightmare = this._nightmare.setPermanent(imbalance);
    if (nightmare !== undefined) {
      this._nightmare = this._nightmare.setTemporary(nightmare);
    }
  }

  override toData(): Changeling20thData {
    return {
      ...super.toData(),
      splat: this.splat,
      glamour: {
        total: this._glamour.total,
        current: this._glamour.current,
      },
      banality: {
        permanent: this._banality.permanent,
        temporary: this._banality.temporary,
      },
      nightmare: {
        permanent: this._nightmare.permanent,
        temporary: this._nightmare.temporary,
      },
      chimericalHealth: {
        total: this._chimericalHealth.total,
        bashing: this._chimericalHealth.bashing,
        lethal: this._chimericalHealth.lethal,
        aggravated: this._chimericalHealth.aggravated,
      },
    };
  }
}
