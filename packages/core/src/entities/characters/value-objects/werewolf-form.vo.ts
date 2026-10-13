import type { WerewolfForm } from "@realm/common";
import { WerewolfFormSchema } from "@realm/common";

/**
 * Werewolf Form Value Object.
 * Manages shapeshifting forms and their dynamic impact on character attributes (e.g. Crinos Health modifier).
 *
 * Immutable - all state mutation operations return new instances.
 */
export class WerewolfFormVO {
  readonly form: WerewolfForm;

  constructor(form: WerewolfForm = "Homid") {
    this.form = WerewolfFormSchema.parse(form);
  }

  /**
   * True if the werewolf is currently in the towering war form (Crinos).
   */
  public get isCrinos(): boolean {
    return this.form === "Crinos";
  }

  /**
   * Health total modifier granted by the current form.
   * Crinos grants +4 total health boxes.
   */
  public get healthModifier(): number {
    return this.isCrinos ? 4 : 0;
  }

  /**
   * Shifts to a new form and calculates the resulting health pool adjustment.
   *
   * @param targetForm - The desired form to shift into
   * @returns An object containing the new WerewolfFormVO and the health delta (+4, -4, or 0)
   */
  public shift(targetForm: WerewolfForm): {
    formVO: WerewolfFormVO;
    healthDelta: number;
  } {
    const validated = WerewolfFormSchema.parse(targetForm);
    let healthDelta = 0;

    if (validated === "Crinos" && this.form !== "Crinos") {
      healthDelta = 4;
    } else if (validated !== "Crinos" && this.form === "Crinos") {
      healthDelta = -4;
    }

    return {
      formVO: new WerewolfFormVO(validated),
      healthDelta,
    };
  }
}
