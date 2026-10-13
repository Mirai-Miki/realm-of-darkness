import type {
  IWerewolf5th,
  Werewolf5thData,
  WerewolfForm,
} from "@realm/common";
import { RealmError, Splat } from "@realm/common";
import { Character5th } from "./character-5th.entity";
import { WerewolfFormVO } from "./value-objects/werewolf-form.vo";

/**
 * Werewolf 5th Edition character entity.
 * Implements W5 mechanics: Rage, Harano, Hauglosk, and shapeshifting Forms.
 */
export class Werewolf5th extends Character5th implements IWerewolf5th {
  private _rage: number;
  private _harano: number;
  private _hauglosk: number;
  private _formVO: WerewolfFormVO;

  constructor(data: Werewolf5thData) {
    super(data);
    this._rage = data.rage;
    this._harano = data.harano;
    this._hauglosk = data.hauglosk;
    this._formVO = new WerewolfFormVO(data.form);
  }

  override get splat(): typeof Splat.Werewolf5th {
    return Splat.Werewolf5th;
  }

  get rage(): number {
    return this._rage;
  }

  get harano(): number {
    return this._harano;
  }

  get hauglosk(): number {
    return this._hauglosk;
  }

  get form(): WerewolfForm {
    return this._formVO.form;
  }

  public setRage(value: number): void {
    if (value < 0 || value > 5) {
      throw new RealmError("Rage must be between 0 and 5", {
        fields: { value: value.toString() },
      });
    }
    this._rage = value;
  }

  public increaseRage(amount = 1): void {
    if (amount < 0) {
      throw new RealmError("Increase amount cannot be negative", {
        fields: { amount: amount.toString() },
      });
    }
    this._rage = Math.min(5, this._rage + amount);
  }

  public decreaseRage(amount = 1): void {
    if (amount < 0) {
      throw new RealmError("Decrease amount cannot be negative", {
        fields: { amount: amount.toString() },
      });
    }
    this._rage = Math.max(0, this._rage - amount);
  }

  public setHarano(value: number): void {
    if (value < 0 || value > 5) {
      throw new RealmError("Harano must be between 0 and 5", {
        fields: { value: value.toString() },
      });
    }
    this._harano = value;
  }

  public setHauglosk(value: number): void {
    if (value < 0 || value > 5) {
      throw new RealmError("Hauglosk must be between 0 and 5", {
        fields: { value: value.toString() },
      });
    }
    this._hauglosk = value;
  }

  /**
   * Shifts into a new form, automatically adjusting the health tracker total
   * when transitioning into or out of the war form (Crinos).
   *
   * @param form - Target form
   */
  public setForm(form: WerewolfForm): void {
    const { formVO, healthDelta } = this._formVO.shift(form);
    this._formVO = formVO;

    if (healthDelta !== 0) {
      this._health = this._health.setTotal(this._health.total + healthDelta);
    }
  }

  override toData(): Werewolf5thData {
    return {
      ...super.toData(),
      splat: this.splat,
      rage: this._rage,
      harano: this._harano,
      hauglosk: this._hauglosk,
      form: this._formVO.form,
    };
  }
}
