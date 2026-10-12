import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextDisplayBuilder,
} from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import type { Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Formats a visual box tracker string (e.g. `🩸🩸▫️▫️▫️ (2/5)`).
 *
 * @param filled - Number of filled boxes
 * @param max - Maximum number of boxes
 * @param icon - Emoji or symbol for filled boxes
 * @returns Formatted tracker line
 *
 * @example
 * ```typescript
 * formatTrackerBoxes(2, 5, "🩸")
 * ```
 */
export function formatTrackerBoxes(
  filled: number,
  max: number,
  icon: string
): string {
  const safeFilled = Math.max(0, Math.min(filled, max));
  const empty = Math.max(0, max - safeFilled);
  return `${icon.repeat(safeFilled)}${"▫️".repeat(empty)} (${safeFilled}/${max})`;
}

/**
 * Props for `CharacterTrackersComponent`.
 */
export interface CharacterTrackersProps {
  /** Current Hunger level (0..5) */
  hunger: number;
  /** Maximum Health boxes */
  healthMax: number;
  /** Current Superficial Health damage */
  healthSuperficial: number;
  /** Maximum Willpower boxes */
  willpowerMax: number;
  /** Current Superficial Willpower damage */
  willpowerSuperficial: number;
}

/**
 * Renders the visual Hunger, Health, and Willpower tracker bars.
 *
 * Reusable in both the `/character` Editor Home dashboard **and** conditional
 * ephemeral `followUp` messages after a dice roll or Rouse Check mutates trackers.
 *
 * @param props - Tracker values
 * @returns `TextDisplayBuilder` containing formatted tracker bars
 *
 * @example
 * ```typescript
 * CharacterTrackersComponent({
 *   hunger: 2,
 *   healthMax: 6,
 *   healthSuperficial: 1,
 *   willpowerMax: 6,
 *   willpowerSuperficial: 2,
 * })
 * ```
 */
export const CharacterTrackersComponent: UIComponent<CharacterTrackersProps> = (
  props
) =>
  new TextDisplayBuilder().setContent(
    `### Trackers\n` +
      `**Hunger:** ${formatTrackerBoxes(props.hunger, 5, "🩸")}\n` +
      `**Health (Superficial):** ${formatTrackerBoxes(props.healthSuperficial, props.healthMax, "❤️")}\n` +
      `**Willpower (Superficial):** ${formatTrackerBoxes(props.willpowerSuperficial, props.willpowerMax, "🧠")}`
  );

/**
 * Props for `TrackerQuickButtonsComponent`.
 */
export interface TrackerQuickButtonsProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Current Hunger level (0..5) */
  hunger: number;
  /** Maximum Willpower boxes */
  willpowerMax: number;
  /** Current Superficial Willpower damage */
  willpowerSuperficial: number;
  /** Control key for decreasing Hunger */
  decHungerControl: string;
  /** Control key for increasing Hunger */
  incHungerControl: string;
  /** Control key for decreasing Willpower damage */
  decWillpowerControl: string;
  /** Control key for increasing Willpower damage */
  incWillpowerControl: string;
}

/**
 * Renders the instant `+/-` adjustment button row for Hunger and Willpower.
 *
 * Reusable across the main Character Editor and ephemeral tracker follow-ups.
 *
 * @param props - Button wiring and current tracker bounds
 * @returns `ActionRowBuilder<ButtonBuilder>`
 *
 * @example
 * ```typescript
 * TrackerQuickButtonsComponent({ ... })
 * ```
 */
export const TrackerQuickButtonsComponent: UIComponent<
  TrackerQuickButtonsProps
> = (props) => {
  const decHungerBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        props.handlerId,
        props.sessionId,
        props.decHungerControl
      )
    )
    .setLabel("- Hunger")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(props.hunger <= 0);

  const incHungerBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        props.handlerId,
        props.sessionId,
        props.incHungerControl
      )
    )
    .setLabel("+ Hunger")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(props.hunger >= 5);

  const decWpBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        props.handlerId,
        props.sessionId,
        props.decWillpowerControl
      )
    )
    .setLabel("- Willpower Dmg")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(props.willpowerSuperficial <= 0);

  const incWpBtn = new ButtonBuilder()
    .setCustomId(
      encodeSessionCustomId(
        props.handlerId,
        props.sessionId,
        props.incWillpowerControl
      )
    )
    .setLabel("+ Willpower Dmg")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(props.willpowerSuperficial >= props.willpowerMax);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    decHungerBtn,
    incHungerBtn,
    decWpBtn,
    incWpBtn
  );
};
