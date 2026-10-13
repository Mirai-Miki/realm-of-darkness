import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { encodeSessionCustomId } from "../../../framework";
import { CharacterControl } from "../../../features/character/character-session.definitions";
import type { ModalActionRowComponentBuilder } from "discord.js";
import type { Snowflake } from "@realm/common";

/**
 * Props for `createCharacterBioModal`.
 */
export interface CharacterBioModalProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Name of the character being edited */
  characterName: string;
  /** Current concept (default: "Unwritten Soul") */
  concept?: string;
  /** Current ambition (default: "Survive the night") */
  ambition?: string;
}

/**
 * Constructs the Discord Modal popup for editing a character's Concept and Ambition biography traits.
 *
 * @param props - Bio modal configuration
 * @returns Fully constructed `ModalBuilder`
 */
export function createCharacterBioModal(
  props: CharacterBioModalProps
): ModalBuilder {
  const conceptInput = new TextInputBuilder()
    .setCustomId("concept")
    .setLabel("Character Concept")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setValue(props.concept ?? "Unwritten Soul");

  const ambitionInput = new TextInputBuilder()
    .setCustomId("ambition")
    .setLabel("Current Ambition")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(150)
    .setValue(props.ambition ?? "Survive the night");

  return new ModalBuilder()
    .setCustomId(
      encodeSessionCustomId(
        props.handlerId,
        props.sessionId,
        CharacterControl.EditBioModal
      )
    )
    .setTitle(`Edit ${props.characterName}`)
    .addComponents(
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        conceptInput
      ),
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        ambitionInput
      )
    );
}
