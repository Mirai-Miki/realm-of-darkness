import {
  ChronicleRepository,
  DiscordGuildChronicleRepository,
  StorytellerRepository,
} from "@realm/repositories";
import { GameEdition } from "@realm/common";
import { logger } from "@realm/logger";
import type {
  ChronicleData,
  IChronicleRepository,
  IDiscordGuildChronicleRepository,
  IStorytellerRepository,
  Snowflake,
} from "@realm/common";

/**
 * Parameters for creating a new chronicle within a Discord guild.
 */
export interface CreateNewChronicleInput {
  /** Discord guild snowflake ID */
  readonly discordId: Snowflake;
  /** Display name for the new chronicle */
  readonly name: string;
  /** Internal user ID of the creator */
  readonly creatorUserId: Snowflake;
  /** Optional default game edition (defaults to 5th) */
  readonly defaultVersion?: GameEdition;
  /** Optional icon URL */
  readonly iconUrl?: string;
}

/**
 * Action that creates a new Chronicle, links it to the current Discord Guild,
 * and grants the creating user Storyteller privileges for the new chronicle.
 */
export class CreateChronicleAction {
  private readonly chronicleRepo: IChronicleRepository;
  private readonly linkRepo: IDiscordGuildChronicleRepository;
  private readonly storytellerRepo: IStorytellerRepository;

  /**
   * Creates a new `CreateChronicleAction` instance.
   *
   * @param chronicleRepo - Optional injected Chronicle repository
   * @param linkRepo - Optional injected DiscordGuildChronicle repository
   * @param storytellerRepo - Optional injected Storyteller repository
   */
  constructor(
    chronicleRepo?: IChronicleRepository,
    linkRepo?: IDiscordGuildChronicleRepository,
    storytellerRepo?: IStorytellerRepository
  ) {
    this.chronicleRepo = chronicleRepo ?? new ChronicleRepository();
    this.linkRepo = linkRepo ?? new DiscordGuildChronicleRepository();
    this.storytellerRepo = storytellerRepo ?? new StorytellerRepository();
  }

  /**
   * Executes the creation of a new chronicle and establishes guild link and storyteller grant.
   *
   * @param input - Creation parameters
   * @returns Newly created ChronicleData
   *
   * @example
   * ```typescript
   * const chronicle = await createChronicleAction.execute({
   *   discordId: guild.id,
   *   name: "Chicago By Night",
   *   creatorUserId: user.id,
   * });
   * ```
   */
  public async execute(input: CreateNewChronicleInput): Promise<ChronicleData> {
    const defaultVersion = input.defaultVersion ?? GameEdition.Fifth;

    // 1. Create the backend chronicle record
    const chronicle = await this.chronicleRepo.create({
      name: input.name,
      iconUrl: input.iconUrl ?? "",
      defaultVersion,
      storytellerRoleIds: [],
    });

    // 2. Link chronicle to the Discord guild
    await this.linkRepo.link({
      discordId: input.discordId,
      chronicleId: chronicle.id,
    });

    // 3. Grant the creating user Storyteller privileges
    await this.storytellerRepo.grant({
      userId: input.creatorUserId,
      chronicleId: chronicle.id,
      provider: input.discordId,
    });

    logger.info("Successfully created and linked new chronicle", {
      fields: {
        chronicleId: chronicle.id,
        chronicleName: chronicle.name,
        discordId: input.discordId,
        creatorUserId: input.creatorUserId,
      },
    });

    return chronicle;
  }
}
