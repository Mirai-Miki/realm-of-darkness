import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import type { Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Props for `BackButtonComponent`.
 */
export interface BackButtonProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Control identifier for the back navigation action */
  control: string;
  /** Optional label text (defaults to `"Back"`) */
  label?: string;
  /** Optional emoji (defaults to `"⬅️"`) */
  emoji?: string;
}

/**
 * Reusable Back button action row wired to a stateless PostgreSQL session.
 *
 * @param props - Back button configuration
 * @returns `ActionRowBuilder<ButtonBuilder>`
 *
 * @example
 * ```typescript
 * BackButtonComponent({
 *   handlerId: "chronicle",
 *   sessionId,
 *   control: ChronicleControl.NavBack,
 * })
 * ```
 */
export const BackButtonComponent: UIComponent<BackButtonProps> = ({
  handlerId,
  sessionId,
  control,
  label = "Back",
  emoji = "⬅️",
}) => {
  const btn = new ButtonBuilder()
    .setCustomId(encodeSessionCustomId(handlerId, sessionId, control))
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(emoji);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(btn);
};
