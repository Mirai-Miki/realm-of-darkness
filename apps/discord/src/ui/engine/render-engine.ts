import { normalizeFragment } from "./fragment-normalizer.util";
import type {
  NormalizedMessagePayload,
  NormalizedRenderEnvelope,
  RenderMessageSpec,
  ScreenRecipe,
} from "./render-engine.types";

/**
 * Converts a single `RenderMessageSpec` into a `NormalizedMessagePayload`.
 */
function normalizeMessageSpec(
  spec: RenderMessageSpec
): NormalizedMessagePayload {
  return {
    components: normalizeFragment(spec.body),
    ephemeral: spec.ephemeral ?? true,
    delivery: spec.delivery ?? "auto",
  };
}

/**
 * Pure UI Render Engine for `@realm/discord`.
 *
 * `RenderEngine` is 100% pure and contains zero Discord API / network dispatch logic:
 * - Evaluates a `ScreenRecipe<TProps>` with its typed `props`.
 * - Normalizes all `UIFragment` trees (flattening nested arrays, stripping `null`/`false`
 *   conditionals, collapsing duplicate `SeparatorBuilder`s).
 * - Filters and normalizes conditional `followUps`.
 * - Returns a `NormalizedRenderEnvelope` that Coordinators return to `InteractionRouter`
 *   for final delivery by `InteractionDispatcher`.
 */
export class RenderEngine {
  /**
   * Evaluates a `ScreenRecipe` with its typed `props` and produces a pure,
   * sanitized `NormalizedRenderEnvelope`.
   *
   * @param recipe - The screen recipe function to evaluate
   * @param props - Typed properties required by the recipe
   * @returns Normalized render envelope ready for `InteractionDispatcher`
   * @throws {RealmError} If any message body normalizes to zero components or exceeds limits
   *
   * @example
   * ```typescript
   * return renderEngine.build(CharacterEditorHomeRecipe, {
   *   sessionId: session.id,
   *   state: session.state,
   * });
   * ```
   */
  public build<TProps>(
    recipe: ScreenRecipe<TProps>,
    props: TProps
  ): NormalizedRenderEnvelope {
    const rawEnvelope = recipe(props);

    if (rawEnvelope.kind === "modal") {
      return {
        kind: "modal",
        modal: rawEnvelope.modal,
      };
    }

    const primary = normalizeMessageSpec(rawEnvelope.primary);
    const followUps: NormalizedMessagePayload[] = [];

    if (rawEnvelope.followUps) {
      for (const candidate of rawEnvelope.followUps) {
        if (candidate) {
          followUps.push(normalizeMessageSpec(candidate));
        }
      }
    }

    return {
      kind: "message",
      primary,
      followUps,
    };
  }
}

/**
 * Shared singleton instance of the pure `RenderEngine`.
 */
export const renderEngine = new RenderEngine();
