import type {
  ConsumableTrackerData,
  IWraith20th,
  Wraith20thData,
} from "@realm/common";
import { Splat } from "@realm/common";
import { Character20th } from "./character-20th.entity";
import { ConsumableTrackerVO } from "./value-objects/consumable-tracker.vo";

/**
 * Wraith 20th Anniversary Edition character entity.
 * Implements mechanics: Corpus and Pathos.
 */
export class Wraith20th extends Character20th implements IWraith20th {
  private _corpus: ConsumableTrackerVO;
  private _pathos: ConsumableTrackerVO;

  constructor(data: Wraith20thData) {
    super(data);
    this._corpus = new ConsumableTrackerVO({
      total: data.corpus.total,
      current: data.corpus.current,
      min: 0,
    });
    this._pathos = new ConsumableTrackerVO({
      total: data.pathos.total,
      current: data.pathos.current,
      min: 0,
    });
  }

  override get splat(): typeof Splat.Wraith20th {
    return Splat.Wraith20th;
  }

  get corpus(): ConsumableTrackerData {
    return {
      total: this._corpus.total,
      current: this._corpus.current,
    };
  }

  get pathos(): ConsumableTrackerData {
    return {
      total: this._pathos.total,
      current: this._pathos.current,
    };
  }

  public spendCorpus(amount = 1): void {
    this._corpus = this._corpus.spend(amount);
  }

  public gainCorpus(amount = 1): void {
    this._corpus = this._corpus.gain(amount);
  }

  public setCorpus(current: number, total?: number): void {
    if (total !== undefined) {
      this._corpus = this._corpus.setTotal(total, false);
    }
    this._corpus = this._corpus.setCurrent(current);
  }

  public spendPathos(amount = 1): void {
    this._pathos = this._pathos.spend(amount);
  }

  public gainPathos(amount = 1): void {
    this._pathos = this._pathos.gain(amount);
  }

  public setPathos(current: number, total?: number): void {
    if (total !== undefined) {
      this._pathos = this._pathos.setTotal(total, false);
    }
    this._pathos = this._pathos.setCurrent(current);
  }

  override toData(): Wraith20thData {
    return {
      ...super.toData(),
      splat: this.splat,
      corpus: {
        total: this._corpus.total,
        current: this._corpus.current,
      },
      pathos: {
        total: this._pathos.total,
        current: this._pathos.current,
      },
    };
  }
}
