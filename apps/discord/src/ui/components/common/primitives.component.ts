import {
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";
import type { UIComponent, UIFragment } from "../../engine";

/**
 * Props for `TextBlockComponent`.
 */
export interface TextBlockProps {
  /** Markdown text content to render */
  content: string;
}

/**
 * Renders a Discord Components V2 `TextDisplayBuilder`.
 *
 * @param props - Text block properties
 * @returns Configured `TextDisplayBuilder`
 *
 * @example
 * ```typescript
 * TextBlockComponent({ content: "# Welcome" })
 * ```
 */
export const TextBlockComponent: UIComponent<TextBlockProps> = ({ content }) =>
  new TextDisplayBuilder().setContent(content);

/**
 * Props for `DividerComponent`.
 */
export interface DividerProps {
  /** Spacing size (defaults to `SeparatorSpacingSize.Large`) */
  size?: SeparatorSpacingSize;
}

/**
 * Renders a Discord Components V2 `SeparatorBuilder`.
 *
 * Note: Adjacent or leading/trailing `DividerComponent`s are automatically
 * collapsed by `RenderEngine` during fragment normalization.
 *
 * @param props - Optional divider sizing properties
 * @returns Configured `SeparatorBuilder`
 *
 * @example
 * ```typescript
 * DividerComponent()
 * ```
 */
export const DividerComponent: UIComponent<DividerProps | void> = (props) =>
  new SeparatorBuilder().setSpacing(props?.size ?? SeparatorSpacingSize.Large);

/**
 * Props for `ActionBannerComponent`.
 */
export interface ActionBannerProps {
  /** Optional status/outcome banner text; renders `null` if undefined or empty */
  text?: string;
}

/**
 * Conditionally renders a highlighted status or roll-outcome banner block.
 * If `text` is undefined or empty, returns `null` so `RenderEngine` strips it cleanly.
 *
 * @param props - Banner text properties
 * @returns `TextDisplayBuilder` or `null`
 *
 * @example
 * ```typescript
 * ActionBannerComponent({ text: state.lastActionBanner })
 * ```
 */
export const ActionBannerComponent: UIComponent<ActionBannerProps> = ({
  text,
}): UIFragment => {
  if (!text || text.trim().length === 0) {
    return null;
  }
  return new TextDisplayBuilder().setContent(`> ${text}`);
};

/**
 * Props for `ErrorAlertComponent`.
 */
export interface ErrorAlertProps {
  /** Error message to display */
  message: string;
  /** True if caused by a `UserError`, false if an unexpected system error */
  isUserError: boolean;
}

/**
 * Renders a standardized Components V2 error alert block.
 *
 * @param props - Error message and classification
 * @returns `TextDisplayBuilder` alert node
 *
 * @example
 * ```typescript
 * ErrorAlertComponent({ message: "Invalid character name", isUserError: true })
 * ```
 */
export const ErrorAlertComponent: UIComponent<ErrorAlertProps> = ({
  message,
  isUserError,
}) =>
  new TextDisplayBuilder().setContent(isUserError ? `⚠️ ${message}` : message);
