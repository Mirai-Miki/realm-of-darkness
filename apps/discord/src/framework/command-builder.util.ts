import { SlashCommandBuilder, InteractionContextType } from "discord.js";
import { CommandOptionType } from "@realm/common";
import { getDiscordCommandManifest } from "@realm/content";
import type {
  CommandOptionData,
  DiscordCommandManifestData,
} from "@realm/common";

/**
 * Applies a single option definition from a `DiscordCommandManifestData` onto a `SlashCommandBuilder`.
 *
 * @param builder - The target `SlashCommandBuilder` instance
 * @param opt - The validated option definition from MDX frontmatter
 */
function applyCommandOption(
  builder: SlashCommandBuilder,
  opt: CommandOptionData
): void {
  switch (opt.type) {
    case CommandOptionType.String:
      builder.addStringOption((option) => {
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required)
          .setAutocomplete(opt.autocomplete);

        if (opt.minLength !== undefined) {
          option.setMinLength(opt.minLength);
        }
        if (opt.maxLength !== undefined) {
          option.setMaxLength(opt.maxLength);
        }
        if (opt.choices && opt.choices.length > 0) {
          option.addChoices(
            ...opt.choices.map((c) => ({
              name: c.name,
              value: String(c.value),
            }))
          );
        }
        return option;
      });
      break;

    case CommandOptionType.Integer:
      builder.addIntegerOption((option) => {
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required)
          .setAutocomplete(opt.autocomplete);

        if (opt.minValue !== undefined) {
          option.setMinValue(opt.minValue);
        }
        if (opt.maxValue !== undefined) {
          option.setMaxValue(opt.maxValue);
        }
        if (opt.choices && opt.choices.length > 0) {
          option.addChoices(
            ...opt.choices.map((c) => ({
              name: c.name,
              value: Number(c.value),
            }))
          );
        }
        return option;
      });
      break;

    case CommandOptionType.Number:
      builder.addNumberOption((option) => {
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required)
          .setAutocomplete(opt.autocomplete);

        if (opt.minValue !== undefined) {
          option.setMinValue(opt.minValue);
        }
        if (opt.maxValue !== undefined) {
          option.setMaxValue(opt.maxValue);
        }
        if (opt.choices && opt.choices.length > 0) {
          option.addChoices(
            ...opt.choices.map((c) => ({
              name: c.name,
              value: Number(c.value),
            }))
          );
        }
        return option;
      });
      break;

    case CommandOptionType.Boolean:
      builder.addBooleanOption((option) =>
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required)
      );
      break;

    case CommandOptionType.User:
      builder.addUserOption((option) =>
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required)
      );
      break;

    case CommandOptionType.Channel:
      builder.addChannelOption((option) =>
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required)
      );
      break;

    case CommandOptionType.Role:
      builder.addRoleOption((option) =>
        option
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required)
      );
      break;
  }
}

/**
 * Converts a validated `DiscordCommandManifestData` object into a Discord.js `SlashCommandBuilder`.
 *
 * @param manifest - The validated command manifest from MDX frontmatter
 * @returns Configured `SlashCommandBuilder` ready for Discord registration
 *
 * @example
 * ```typescript
 * const builder = buildSlashCommandFromManifest(manifest);
 * ```
 */
export function buildSlashCommandFromManifest(
  manifest: DiscordCommandManifestData
): SlashCommandBuilder {
  const builder = new SlashCommandBuilder()
    .setName(manifest.name)
    .setDescription(manifest.description);

  // Set contexts based on dmPermission flag using modern Discord InteractionContextType
  if (manifest.dmPermission) {
    builder.setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    );
  } else {
    builder.setContexts(InteractionContextType.Guild);
  }

  for (const opt of manifest.options) {
    applyCommandOption(builder, opt);
  }

  return builder;
}

/**
 * Loads a command manifest by name from the `@realm/content` MDX Single Source of Truth
 * and returns a configured `SlashCommandBuilder`.
 *
 * @param commandName - Name of the command (e.g. `"character"`)
 * @returns Configured `SlashCommandBuilder`
 * @throws {RealmError} If the MDX file is missing or invalid
 *
 * @example
 * ```typescript
 * const commandData = buildSlashCommandFromMdx("character");
 * ```
 */
export function buildSlashCommandFromMdx(
  commandName: string
): SlashCommandBuilder {
  const manifest = getDiscordCommandManifest(commandName);
  return buildSlashCommandFromManifest(manifest);
}
