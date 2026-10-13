import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextDisplayBuilder,
} from "discord.js";
import { Splat } from "@realm/common";
import { encodeSessionCustomId } from "../../../framework";
import { CharacterControl } from "../../../features/character/character-session.definitions";
import type { CharacterData, Snowflake } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Formats a visual box tracker string (e.g. `🩸🩸▫️▫️▫️ (2/5)`).
 *
 * @param filled - Number of filled boxes
 * @param max - Maximum number of boxes
 * @param icon - Emoji or symbol for filled boxes
 * @returns Formatted tracker line
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
  /** Authoritative character data record */
  character: CharacterData;
}

/**
 * Renders the visual resource trackers appropriate to the character's splat.
 *
 * Automatically formats Hunger/Humanity for V5, Rage/Form for W5,
 * Blood Pool for V20, Quintessence/Paradox for M20, etc.
 *
 * @param props - Character data record
 * @returns `TextDisplayBuilder` containing formatted tracker bars
 */
export const CharacterTrackersComponent: UIComponent<
  CharacterTrackersProps
> = ({ character }) => {
  const lines: string[] = ["### Trackers"];

  switch (character.splat) {
    case Splat.Vampire5th: {
      const v5 = character;
      lines.push(`**Hunger:** ${formatTrackerBoxes(v5.hunger, 5, "🩸")}`);
      const humTotal = v5.humanity?.total ?? 7;
      const stains = v5.humanity?.stains ?? 0;
      const emptyHum = Math.max(0, 10 - humTotal - stains);
      lines.push(
        `**Humanity:** ${"◽".repeat(humTotal)}${"◾".repeat(stains)}${"▫️".repeat(emptyHum)} (${humTotal}/10${stains > 0 ? `, ${stains} stains` : ""})`
      );
      lines.push(
        `**Health (Superficial):** ${formatTrackerBoxes(v5.health.superficial, v5.health.total, "❤️")}`
      );
      lines.push(
        `**Willpower (Superficial):** ${formatTrackerBoxes(v5.willpower.superficial, v5.willpower.total, "🧠")}`
      );
      break;
    }

    case Splat.Werewolf5th: {
      const w5 = character;
      lines.push(`**Rage:** ${formatTrackerBoxes(w5.rage, 5, "🐺")}`);
      lines.push(
        `**Active Form:** 🐺 **${w5.form}**${w5.form === "Crinos" ? " *(+4 Health active)*" : ""}`
      );
      lines.push(
        `**Harano:** ${formatTrackerBoxes(w5.harano, 5, "🖤")} | **Hauglosk:** ${formatTrackerBoxes(w5.hauglosk, 5, "⚡")}`
      );
      lines.push(
        `**Health (Superficial):** ${formatTrackerBoxes(w5.health.superficial, w5.health.total, "❤️")}`
      );
      lines.push(
        `**Willpower (Superficial):** ${formatTrackerBoxes(w5.willpower.superficial, w5.willpower.total, "🧠")}`
      );
      break;
    }

    case Splat.Hunter5th: {
      const h5 = character;
      lines.push(
        `**Desperation:** ${formatTrackerBoxes(h5.desperation, 5, "🎯")} | **Danger:** ${formatTrackerBoxes(h5.danger, 5, "⚠️")}`
      );
      lines.push(
        `**Status:** ${h5.despair ? "❌ **In Despair**" : "✅ Clear"}`
      );
      lines.push(
        `**Health (Superficial):** ${formatTrackerBoxes(h5.health.superficial, h5.health.total, "❤️")}`
      );
      lines.push(
        `**Willpower (Superficial):** ${formatTrackerBoxes(h5.willpower.superficial, h5.willpower.total, "🧠")}`
      );
      break;
    }

    case Splat.Vampire20th: {
      const v20 = character;
      lines.push(
        `**Blood Pool:** ${formatTrackerBoxes(v20.bloodPool.current, v20.bloodPool.total, "🩸")}`
      );
      lines.push(
        `**Morality (${v20.morality.name}):** ${v20.morality.value}/10`
      );
      lines.push(
        `**Health:** ${v20.health.total} boxes (Bashing: ${v20.health.bashing}, Lethal: ${v20.health.lethal}, Agg: ${v20.health.aggravated})`
      );
      lines.push(
        `**Willpower:** ${formatTrackerBoxes(v20.willpower.current, v20.willpower.total, "🧠")}`
      );
      break;
    }

    case Splat.Werewolf20th: {
      const w20 = character;
      lines.push(
        `**Rage:** ${formatTrackerBoxes(w20.rage.current, w20.rage.total, "🐺")} *(Unlocked)*`
      );
      lines.push(
        `**Gnosis:** ${formatTrackerBoxes(w20.gnosis.current, w20.gnosis.total, "🌕")}`
      );
      lines.push(
        `**Health:** ${w20.health.total} boxes (Bashing: ${w20.health.bashing}, Lethal: ${w20.health.lethal}, Agg: ${w20.health.aggravated})`
      );
      lines.push(
        `**Willpower:** ${formatTrackerBoxes(w20.willpower.current, w20.willpower.total, "🧠")}`
      );
      break;
    }

    case Splat.Mage20th: {
      const m20 = character;
      lines.push(`**Arete:** ${m20.arete}`);
      lines.push(
        `**Quintessence:** ${m20.quintessence.quintessence}/20 | **Paradox:** ${m20.quintessence.paradox}/20 *(Available Wheel Cap: ${20 - m20.quintessence.paradox})*`
      );
      lines.push(
        `**Health:** ${m20.health.total} boxes (Bashing: ${m20.health.bashing}, Lethal: ${m20.health.lethal}, Agg: ${m20.health.aggravated})`
      );
      lines.push(
        `**Willpower:** ${formatTrackerBoxes(m20.willpower.current, m20.willpower.total, "🧠")}`
      );
      break;
    }

    default: {
      // Generic / Mortal / Ghoul
      if ("health" in character && "willpower" in character) {
        const char5 = character as {
          health: {
            total: number;
            superficial?: number;
            bashing?: number;
            lethal?: number;
          };
          willpower: { total: number; superficial?: number; current?: number };
        };
        const healthFilled =
          char5.health.superficial ??
          (char5.health.bashing ?? 0) + (char5.health.lethal ?? 0);
        lines.push(
          `**Health:** ${formatTrackerBoxes(healthFilled, char5.health.total, "❤️")}`
        );
        const wpFilled =
          char5.willpower.superficial ?? char5.willpower.current ?? 0;
        lines.push(
          `**Willpower:** ${formatTrackerBoxes(wpFilled, char5.willpower.total, "🧠")}`
        );
      }
      break;
    }
  }

  return new TextDisplayBuilder().setContent(lines.join("\n"));
};

/**
 * Props for `TrackerQuickButtonsComponent`.
 */
export interface TrackerQuickButtonsProps {
  /** Target coordinator/handler ID */
  handlerId: string;
  /** PostgreSQL `interaction_sessions` Snowflake ID */
  sessionId: Snowflake;
  /** Full character data record */
  character: CharacterData;
}

/**
 * Renders the splat-adaptive instant adjustment button row for the character sheet.
 *
 * @param props - Button wiring and character data
 * @returns `ActionRowBuilder<ButtonBuilder>`
 */
export const TrackerQuickButtonsComponent: UIComponent<
  TrackerQuickButtonsProps
> = ({ handlerId, sessionId, character }) => {
  const row = new ActionRowBuilder<ButtonBuilder>();

  if (character.splat === Splat.Vampire5th) {
    const v5 = character;
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.DecreaseHunger
          )
        )
        .setLabel("- Hunger")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(v5.hunger <= 0),
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.IncreaseHunger
          )
        )
        .setLabel("+ Hunger")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(v5.hunger >= 5),
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.DecreaseWillpower
          )
        )
        .setLabel("- Willpower Dmg")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(v5.willpower.superficial <= 0),
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.IncreaseWillpower
          )
        )
        .setLabel("+ Willpower Dmg")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(v5.willpower.superficial >= v5.willpower.total)
    );
  } else if (character.splat === Splat.Werewolf5th) {
    const w5 = character;
    const isCrinos = w5.form === "Crinos";
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.DecreaseRage
          )
        )
        .setLabel("- Rage")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(w5.rage <= 0),
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.IncreaseRage
          )
        )
        .setLabel("+ Rage")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(w5.rage >= 5),
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            isCrinos
              ? CharacterControl.ShiftHomid
              : CharacterControl.ShiftCrinos
          )
        )
        .setLabel(isCrinos ? "👤 Shift Homid" : "🐺 Shift Crinos")
        .setStyle(isCrinos ? ButtonStyle.Secondary : ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.IncreaseWillpower
          )
        )
        .setLabel("+ Willpower Dmg")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(w5.willpower.superficial >= w5.willpower.total)
    );
  } else if (character.splat === Splat.Vampire20th) {
    const v20 = character;
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.SpendBlood
          )
        )
        .setLabel("- Blood")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(v20.bloodPool.current <= 0),
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.SlakeBlood
          )
        )
        .setLabel("+ Blood")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(v20.bloodPool.current >= v20.bloodPool.total),
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.SpendWillpower
          )
        )
        .setLabel("- Willpower")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(v20.willpower.current <= 0),
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.RestoreWillpower
          )
        )
        .setLabel("+ Willpower")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(v20.willpower.current >= v20.willpower.total)
    );
  } else {
    // Default 5th / 20th willpower controls
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.DecreaseWillpower
          )
        )
        .setLabel("- Willpower")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(
          encodeSessionCustomId(
            handlerId,
            sessionId,
            CharacterControl.IncreaseWillpower
          )
        )
        .setLabel("+ Willpower")
        .setStyle(ButtonStyle.Primary)
    );
  }

  return row;
};
