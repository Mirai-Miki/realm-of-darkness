import type {
  ActionRowBuilder,
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MessageActionRowComponentBuilder,
  ModalBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";

/**
 * Any valid top-level Discord Components V2 builder node.
 */
export type UINode =
  | TextDisplayBuilder
  | SeparatorBuilder
  | ActionRowBuilder<MessageActionRowComponentBuilder>
  | ContainerBuilder
  | SectionBuilder
  | MediaGalleryBuilder
  | FileBuilder;

/**
 * React-like recursive UI fragment.
 *
 * Allows components and recipes to return single nodes, nested arrays of nodes,
 * or falsy conditional expressions (`null`, `undefined`, `false`) which are
 * automatically stripped and flattened by the `RenderEngine`.
 */
export type UIFragment =
  UINode | readonly UIFragment[] | null | undefined | false;

/**
 * Stateless, React-like functional UI component that maps typed `props`
 * to a `UIFragment`.
 */
export type UIComponent<TProps = void> = (props: TProps) => UIFragment;

/**
 * Specification for a single Discord Components V2 message before normalization.
 */
export interface RenderMessageSpec {
  /** Composable UI fragment tree forming the message body */
  body: UIFragment;
  /** Whether this message should only be visible to the interacting user (default: true) */
  ephemeral?: boolean;
  /**
   * Preferred delivery mode for primary component interactions:
   * - `"auto"` (default): Updates in-place for message components, replies for commands.
   * - `"reply"`: Forces a new reply message even when triggered from a button/select.
   * - `"update"`: Forces an in-place update on the existing component message.
   */
  delivery?: "auto" | "reply" | "update";
}

/**
 * Raw envelope returned by a `ScreenRecipe` prior to normalization by `RenderEngine`.
 *
 * Can represent either:
 * 1. A standard/multi-message Components V2 response (`primary` + `0..N` conditional `followUps`), or
 * 2. A Discord Modal popup (`modal`).
 */
export type RenderEnvelope =
  | {
      kind?: "message";
      /** Primary message to reply or update with */
      primary: RenderMessageSpec;
      /**
       * Optional array of secondary follow-up messages (e.g. an ephemeral character
       * tracker update sent only when `characterChanged === true` after a public roll).
       * Falsy entries (`false`, `null`, `undefined`) are automatically filtered out!
       */
      followUps?: readonly (RenderMessageSpec | null | undefined | false)[];
    }
  | {
      kind: "modal";
      /** Discord ModalBuilder to display via `showModal()` */
      modal: ModalBuilder;
    };

/**
 * Normalized, ready-to-send message payload produced by `RenderEngine.build()`.
 */
export interface NormalizedMessagePayload {
  /** Flattened, sanitized, non-empty array of Discord Components V2 nodes */
  readonly components: readonly UINode[];
  /** Whether the message is ephemeral */
  readonly ephemeral: boolean;
  /** Resolved delivery preference */
  readonly delivery: "auto" | "reply" | "update";
}

/**
 * Pure, normalized output produced by `RenderEngine.build()`.
 *
 * Returned by Coordinators to `InteractionRouter` and consumed by `InteractionDispatcher`
 * to perform the actual Discord API handoff.
 */
export type NormalizedRenderEnvelope =
  | {
      readonly kind: "message";
      readonly primary: NormalizedMessagePayload;
      readonly followUps: readonly NormalizedMessagePayload[];
    }
  | {
      readonly kind: "modal";
      readonly modal: ModalBuilder;
    };

/**
 * Strongly-typed screen recipe that takes domain `props`, composes `UIComponent`s,
 * and returns a `RenderEnvelope`.
 */
export type ScreenRecipe<TProps = void> = (props: TProps) => RenderEnvelope;
