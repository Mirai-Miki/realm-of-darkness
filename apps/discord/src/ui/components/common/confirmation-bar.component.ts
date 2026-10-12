import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import type { Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Props for `ConfirmationBarComponent`.
 */
export interface ConfirmationBarProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Control identifier for the confirm button */
  confirmControl: string;
  /** Control identifier for the cancel button */
  cancelControl: string;
  /** Label text for the confirm button */
  confirmLabel: string;
  /** Optional label text for the cancel button (defaults to `"Cancel"`) */
  cancelLabel?: string;
  /** Optional button style for the confirm button (defaults to `ButtonStyle.Success`) */
  confirmStyle?: ButtonStyle;
}

/**
 * Reusable confirmation action row (`[Confirm]` / `[Cancel]`) wired to a
 * stateless PostgreSQL session.
 *
 * @param props - Confirmation button configuration
 * @returns `ActionRowBuilder<ButtonBuilder>`
 *
 * @example
 * ```typescript
 * ConfirmationBarComponent({
 *   handlerId: "character",
 *   sessionId,
 *   confirmControl: "confirm_yes",
 *   cancelControl: "confirm_cancel",
 *   confirmLabel: 'Create "Viktor"',
 * })
 * ```
 */
export const ConfirmationBarComponent: UIComponent<ConfirmationBarProps> = ({
  handlerId,
  sessionId,
  confirmControl,
  cancelControl,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmStyle = ButtonStyle.Success,
}) => {
  const confirmBtn = new ButtonBuilder()
    .setCustomId(encodeSessionCustomId(handlerId, sessionId, confirmControl))
    .setLabel(confirmLabel)
    .setStyle(confirmStyle);

  const cancelBtn = new ButtonBuilder()
    .setCustomId(encodeSessionCustomId(handlerId, sessionId, cancelControl))
    .setLabel(cancelLabel)
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    confirmBtn,
    cancelBtn
  );
};
