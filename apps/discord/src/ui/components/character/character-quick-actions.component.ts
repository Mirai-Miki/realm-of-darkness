import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { Splat } from "@realm/common";
import { encodeSessionCustomId } from "../../../framework";
import {
  CharacterControl,
  CharacterQuickAction,
} from "../../../features/character/character-session.definitions";
import type { CharacterData, Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Builds quick action dropdown options appropriate to the character's splat.
 *
 * @param character - Full character data record
 * @returns Array of select menu options
 */
function buildQuickActionOptions(
  character: CharacterData
): StringSelectMenuOptionBuilder[] {
  const options: StringSelectMenuOptionBuilder[] = [];

  if (character.splat === Splat.Vampire5th) {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel("🎲 Perform Rouse Check")
        .setDescription(
          "Roll 1d10 (Difficulty 6) — increases Hunger on failure"
        )
        .setValue(CharacterQuickAction.RouseCheck),
      new StringSelectMenuOptionBuilder()
        .setLabel("🩹 Mend Superficial Health")
        .setDescription("Rouse blood to heal 1 superficial health damage")
        .setValue(CharacterQuickAction.MendSuperficial)
    );
  } else if (character.splat === Splat.Werewolf5th) {
    const isCrinos = (character as { form?: string }).form === "Crinos";
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(isCrinos ? "👤 Shift to Homid" : "🐺 Shift to Crinos")
        .setDescription(
          isCrinos
            ? "Revert to human form (resets health modifier)"
            : "Shift into war form (+4 Health boxes)"
        )
        .setValue(
          isCrinos
            ? CharacterQuickAction.ShiftHomid
            : CharacterQuickAction.ShiftCrinos
        ),
      new StringSelectMenuOptionBuilder()
        .setLabel("🩹 Mend Superficial Health")
        .setDescription("Heal 1 superficial health damage")
        .setValue(CharacterQuickAction.MendSuperficial)
    );
  } else {
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel("🩹 Heal Damage")
        .setDescription("Heal 1 health damage box")
        .setValue(CharacterQuickAction.HealDamage)
    );
  }

  options.push(
    new StringSelectMenuOptionBuilder()
      .setLabel("✏️ Edit Concept & Ambition (Modal)")
      .setDescription(
        "Open a popup form to update your character's biography traits"
      )
      .setValue(CharacterQuickAction.OpenBioModal)
  );

  return options;
}

/**
 * Props for `CharacterQuickActionsComponent`.
 */
export interface CharacterQuickActionsProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Full authoritative character record from repository */
  character: CharacterData;
}

/**
 * Renders the quick actions and editor tools select menu on the character sheet dashboard.
 *
 * @param props - Quick actions configuration
 * @returns `ActionRowBuilder<StringSelectMenuBuilder>`
 */
export const CharacterQuickActionsComponent: UIComponent<
  CharacterQuickActionsProps
> = ({ handlerId, sessionId, character }) => {
  const quickActionSelect = new StringSelectMenuBuilder()
    .setCustomId(
      encodeSessionCustomId(
        handlerId,
        sessionId,
        CharacterControl.QuickActionMenu
      )
    )
    .setPlaceholder("⚡ Select an action or editor tool...")
    .addOptions(buildQuickActionOptions(character));

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    quickActionSelect
  );
};
