import { GameEdition } from "@realm/common";
import { TextBlockComponent } from "../common";
import type { ChronicleData } from "@realm/common";
import type { UIComponent } from "../../engine";

/**
 * Formats a `GameEdition` value into a user-friendly label.
 *
 * @param edition - Target game edition
 * @returns Human-readable label
 */
export function formatGameEditionLabel(edition: GameEdition): string {
  switch (edition) {
    case GameEdition.Fifth:
      return "5th Edition (V5 / W5 / H5)";
    case GameEdition.Twentieth:
      return "20th Anniversary (V20 / W20 / M20)";
    case GameEdition.Cod:
      return "Chronicles of Darkness (CofD / VtR)";
    default:
      return edition;
  }
}

/**
 * Props for `ChronicleSummaryComponent`.
 */
export interface ChronicleSummaryProps {
  /** The active chronicle record */
  activeChronicle: ChronicleData;
  /** Number of chronicles linked to this guild */
  linkedChroniclesCount: number;
  /** Number of storyteller users assigned to this chronicle */
  storytellerUsersCount: number;
}

/**
 * Renders the markdown summary text block for a chronicle's settings dashboard.
 *
 * @param props - Chronicle summary configuration
 * @returns `TextDisplayBuilder` UI node
 */
export const ChronicleSummaryComponent: UIComponent<ChronicleSummaryProps> = ({
  activeChronicle,
  linkedChroniclesCount,
  storytellerUsersCount,
}) => {
  const editionText = formatGameEditionLabel(activeChronicle.defaultVersion);
  const stRolesCount = activeChronicle.storytellerRoleIds.length;

  return TextBlockComponent({
    content:
      `# 📖 Chronicle Settings — ${activeChronicle.name}\n\n` +
      `**Default Game Edition:** \`${editionText}\`\n` +
      `**Storyteller Roles:** ${stRolesCount} assigned\n` +
      `**Storyteller Users:** ${storytellerUsersCount} assigned\n` +
      `**Total Server Chronicles:** ${linkedChroniclesCount}\n`,
  });
};
