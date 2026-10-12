import { logger } from "@realm/logger";
import {
  DiscordGuildRepository,
  DiscordGuildChronicleRepository,
  ChronicleRepository,
} from "@realm/repositories";
import type { Guild } from "discord.js";
import type {
  DiscordGuildChronicleData,
  DiscordGuildData,
  IChronicleRepository,
  IDiscordGuildChronicleRepository,
  IDiscordGuildRepository,
} from "@realm/common";

/**
 * Result returned after ensuring a Discord Guild and its default Chronicle are created and linked.
 */
export interface CreateGuildResult {
  /** The persisted Discord guild configuration data. */
  readonly guildData: DiscordGuildData;
  /** All chronicle links associated with this Discord guild. */
  readonly chronicleLinks: DiscordGuildChronicleData[];
}

/**
 * Action that coordinates the initial creation and setup of a Discord Guild
 * and its default associated Chronicle in our database.
 *
 * Preserves the decoupling between `DiscordGuild` (frontend Discord server configuration)
 * and `Chronicle` (backend game session):
 * - Always ensures the `discord_guilds` record is present and up-to-date.
 * - Creates and links a default `chronicles` record only if the guild has no linked chronicles yet.
 */
export class CreateGuildAction {
  /** Repository for persisting Discord Guild records. */
  private readonly guildRepository: IDiscordGuildRepository;
  /** Repository for managing Guild-to-Chronicle many-to-many links. */
  private readonly linkRepository: IDiscordGuildChronicleRepository;
  /** Repository for persisting core Chronicle records. */
  private readonly chronicleRepository: IChronicleRepository;

  /**
   * Creates a new `CreateGuildAction` instance.
   *
   * @param guildRepository - Optional injected DiscordGuild repository
   * @param linkRepository - Optional injected DiscordGuildChronicle repository
   * @param chronicleRepository - Optional injected Chronicle repository
   *
   * @example
   * ```typescript
   * const createGuildAction = new CreateGuildAction();
   * ```
   */
  constructor(
    guildRepository?: IDiscordGuildRepository,
    linkRepository?: IDiscordGuildChronicleRepository,
    chronicleRepository?: IChronicleRepository
  ) {
    this.guildRepository = guildRepository ?? new DiscordGuildRepository();
    this.linkRepository =
      linkRepository ?? new DiscordGuildChronicleRepository();
    this.chronicleRepository = chronicleRepository ?? new ChronicleRepository();
  }

  /**
   * Executes the action to ensure a guild and its default Chronicle are created and linked.
   *
   * If the guild is already tracked and has at least one linked Chronicle, it refreshes
   * the `discord_guilds` metadata without creating a duplicate Chronicle or overwriting
   * existing Chronicle names.
   *
   * @param guild - The Discord guild to create and configure
   * @returns The persisted DiscordGuildData and its associated DiscordGuildChronicleData links
   * @throws {RealmError} If any database persistence operation fails
   *
   * @example
   * ```typescript
   * const result = await createGuildAction.execute(guild);
   * ```
   */
  public async execute(guild: Guild): Promise<CreateGuildResult> {
    // Ensure the frontend DiscordGuild record exists and has current metadata
    const guildData = await this.guildRepository.upsert({
      discordId: guild.id,
      name: guild.name,
      iconUrl: guild.iconURL() || "",
    });

    // Check if the guild already has at least one linked Chronicle
    const existingLinks = await this.linkRepository.findByDiscordId(guild.id);
    if (existingLinks.length > 0) {
      return {
        guildData,
        chronicleLinks: existingLinks,
      };
    }

    logger.info(
      `New guild joined: ${guild.name} (${guild.id}). Setting up default Chronicle.`
    );

    // Create the default backend Chronicle named after the guild
    const chronicle = await this.chronicleRepository.create({
      name: guild.name,
      iconUrl: guild.iconURL() || "",
    });

    // Link the new Chronicle to the Discord Guild
    const link = await this.linkRepository.link({
      discordId: guild.id,
      chronicleId: chronicle.id,
    });

    logger.info(
      `Successfully created and linked default Chronicle (${chronicle.id}) for guild ${guild.id}`
    );

    return {
      guildData,
      chronicleLinks: [link],
    };
  }
}
