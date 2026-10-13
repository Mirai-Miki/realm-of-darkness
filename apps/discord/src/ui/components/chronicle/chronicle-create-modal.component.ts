import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import { ChronicleControl } from "../../../features/chronicle/chronicle-session.definitions";
import type { ModalActionRowComponentBuilder } from "discord.js";
import type { Snowflake } from "@realm/common";

/**
 * Props for `createChronicleCreateModal`.
 */
export interface ChronicleCreateModalProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
}

/**
 * Constructs the Discord Modal popup for creating a new server Chronicle.
 *
 * @param props - Chronicle create modal configuration
 * @returns Fully constructed `ModalBuilder`
 */
export function createChronicleCreateModal(
  props: ChronicleCreateModalProps
): ModalBuilder {
  const nameInput = new TextInputBuilder()
    .setCustomId("chronicleName")
    .setLabel("Chronicle Name")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g., Boston By Night")
    .setMinLength(2)
    .setMaxLength(50)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(
      encodeSessionCustomId(
        props.handlerId,
        props.sessionId,
        ChronicleControl.SubmitCreateModal
      )
    )
    .setTitle("Create New Chronicle")
    .addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        nameInput
      )
    );
}
