import { ErrorAlertComponent } from "../components";
import type { ErrorAlertProps } from "../components";
import type { ScreenRecipe } from "../engine";

/**
 * Global screen recipe used by `InteractionRouter` when catching unhandled
 * `UserError` or `RealmError` exceptions.
 *
 * @param props - Error message and classification
 * @returns `RenderEnvelope` containing the ephemeral error alert
 *
 * @example
 * ```typescript
 * const envelope = renderEngine.build(ErrorAlertRecipe, {
 *   message: "Invalid character name",
 *   isUserError: true,
 * });
 * ```
 */
export const ErrorAlertRecipe: ScreenRecipe<ErrorAlertProps> = (props) => ({
  primary: {
    ephemeral: true,
    delivery: "reply",
    body: ErrorAlertComponent(props),
  },
});
