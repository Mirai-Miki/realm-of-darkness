import {
  ChronicleRepository,
  DiscordGuildChronicleRepository,
  InteractionSessionRepository,
  StorytellerRepository,
  UserRepository,
} from "@realm/repositories";
import { GameEditionSchema, RealmError, UserError } from "@realm/common";
import {
  Coordinator,
  buildSlashCommandFromMdx,
  decodeSessionCustomId,
} from "../../framework";
import { renderEngine } from "../../ui";
import {
  CheckStorytellerPermissionAction,
  CreateChronicleAction,
  DeleteChronicleAction,
} from "./actions";
import {
  CHRONICLE_HANDLER_ID,
  ChronicleDashboardRecipe,
  ConfirmDeleteChronicleRecipe,
  CreateChronicleModalRecipe,
  ManageStorytellersRecipe,
  SelectActiveChronicleRecipe,
  SelectVersionRecipe,
} from "./chronicle.recipes";
import {
  ChronicleControl,
  ChronicleSessionStateDataSchema,
  ChronicleWorkflowStep,
} from "./chronicle-session.definitions";
import type { UserSelectMenuInteraction } from "discord.js";
import type { CommandContext, InterfaceContext } from "../../framework";
import type {
  ChronicleData,
  IChronicleRepository,
  IDiscordGuildChronicleRepository,
  IStorytellerRepository,
  IUserRepository,
  Snowflake,
  UserData,
} from "@realm/common";
import type { NormalizedRenderEnvelope } from "../../ui";
import type { ChronicleSessionStateData } from "./chronicle-session.definitions";

/**
 * Unified Coordinator for the `/chronicle` command and all interactive
 * chronicle settings screens, modal dialogs, and component interactions.
 */
export class ChronicleCoordinator extends Coordinator {
  public readonly data = buildSlashCommandFromMdx(CHRONICLE_HANDLER_ID);

  private readonly sessionRepo: InteractionSessionRepository;
  private readonly chronicleRepo: IChronicleRepository;
  private readonly linkRepo: IDiscordGuildChronicleRepository;
  private readonly storytellerRepo: IStorytellerRepository;
  private readonly userRepo: IUserRepository;
  private readonly checkStorytellerAction: CheckStorytellerPermissionAction;
  private readonly createChronicleAction: CreateChronicleAction;
  private readonly deleteChronicleAction: DeleteChronicleAction;

  /**
   * Creates a new `ChronicleCoordinator` instance.
   */
  constructor(
    sessionRepo?: InteractionSessionRepository,
    chronicleRepo?: IChronicleRepository,
    linkRepo?: IDiscordGuildChronicleRepository,
    storytellerRepo?: IStorytellerRepository,
    userRepo?: IUserRepository
  ) {
    super();
    this.sessionRepo = sessionRepo ?? new InteractionSessionRepository();
    this.chronicleRepo = chronicleRepo ?? new ChronicleRepository();
    this.linkRepo = linkRepo ?? new DiscordGuildChronicleRepository();
    this.storytellerRepo = storytellerRepo ?? new StorytellerRepository();
    this.userRepo = userRepo ?? new UserRepository();

    this.checkStorytellerAction = new CheckStorytellerPermissionAction(
      this.storytellerRepo
    );
    this.createChronicleAction = new CreateChronicleAction(
      this.chronicleRepo,
      this.linkRepo,
      this.storytellerRepo
    );
    this.deleteChronicleAction = new DeleteChronicleAction(
      this.chronicleRepo,
      this.linkRepo,
      this.createChronicleAction
    );
  }

  /**
   * Resolves a selected Discord user into an RoD user record, inserting them if they have never interacted before.
   *
   * @param interaction - The user select menu interaction containing Discord user cache
   * @param discordId - Discord snowflake ID
   * @returns The resolved RoD UserData record
   */
  private async resolveTargetUser(
    interaction: UserSelectMenuInteraction,
    discordId: Snowflake
  ): Promise<UserData> {
    const existing = await this.userRepo.findByDiscordId(discordId);
    if (existing) {
      return existing;
    }

    const discordUser =
      interaction.users.get(discordId) ??
      (await interaction.client.users.fetch(discordId).catch(() => null));

    return this.userRepo.upsertFromDiscordProfile({
      discordId,
      displayName:
        discordUser?.displayName ?? discordUser?.username ?? "Storyteller",
      avatarUrl: discordUser?.displayAvatarURL() ?? "",
    });
  }

  /**
   * Retrieves the Discord Snowflake IDs for all storytellers assigned to a chronicle.
   *
   * @param chronicleId - Chronicle snowflake ID
   * @returns Array of Discord snowflake IDs
   */
  private async getChronicleStorytellerDiscordIds(
    chronicleId: Snowflake
  ): Promise<Snowflake[]> {
    const stUsers = await this.storytellerRepo.findByChronicle(chronicleId);
    const userIds = [...new Set(stUsers.map((s) => s.userId))];
    if (userIds.length === 0) {
      return [];
    }
    const users = await this.userRepo.findManyByIds(userIds);
    return users
      .map((u) => u?.discordId)
      .filter((id): id is string => Boolean(id));
  }

  /**
   * Executes the `/chronicle` slash command and displays the Chronicle Dashboard.
   *
   * @param ctx - The Discord command context
   * @returns Normalized render envelope for the Chronicle Settings Dashboard
   * @throws {UserError} If executed outside a guild or if user is unauthorized
   */
  public async execute(ctx: CommandContext): Promise<NormalizedRenderEnvelope> {
    const { interaction, guild, actor } = ctx;

    if (!interaction.guild || !guild) {
      throw new UserError(
        "The /chronicle command can only be used within a Discord server."
      );
    }

    const userId = actor?.id ?? interaction.user.id;

    // Resolve or establish linked chronicles
    const links = await this.linkRepo.findByDiscordId(guild.discordId);
    let activeChronicle: ChronicleData;

    if (links.length === 0) {
      activeChronicle = await this.createChronicleAction.execute({
        discordId: guild.discordId,
        name: interaction.guild.name,
        creatorUserId: userId,
        iconUrl: interaction.guild.iconURL() ?? undefined,
      });
    } else {
      const firstLink = links[0];
      if (!firstLink) {
        throw new UserError("Failed to resolve linked chronicle.");
      }
      const existing = await this.chronicleRepo.findById(firstLink.chronicleId);
      if (!existing) {
        throw new UserError("Active chronicle not found.");
      }
      activeChronicle = existing;
    }

    // Verify Storyteller authorization
    await this.checkStorytellerAction.execute(ctx, {
      chronicleId: activeChronicle.id,
      chronicleStorytellerRoleIds: activeChronicle.storytellerRoleIds,
    });

    // Create stateless session
    const initialState: ChronicleSessionStateData = {
      guildId: guild.discordId,
      activeChronicleId: activeChronicle.id,
      history: [],
    };

    const session = await this.sessionRepo.create(
      {
        userId,
        handlerId: this.handlerId,
        step: ChronicleWorkflowStep.Dashboard,
        state: initialState,
      },
      ChronicleSessionStateDataSchema
    );

    return this.renderDashboardEnvelope(
      session.id,
      session.state,
      activeChronicle
    );
  }

  /**
   * Routes all interactive buttons, selects, and modals for `/chronicle`.
   *
   * @param ctx - The Discord interface context
   * @returns Normalized render envelope for the target screen or modal
   */
  public async handleInterface(
    ctx: InterfaceContext
  ): Promise<NormalizedRenderEnvelope> {
    const { interaction, actor, guild } = ctx;

    if (!interaction.guild || !guild) {
      throw new UserError("Interaction must occur within a Discord server.");
    }

    const { sessionId, control } = decodeSessionCustomId(interaction.customId);
    const userId = actor?.id ?? interaction.user.id;

    const session = await this.sessionRepo.getActive(
      sessionId,
      ChronicleSessionStateDataSchema,
      userId
    );

    // Verify Storyteller permissions
    const activeChronicle = await this.chronicleRepo.findById(
      session.state.activeChronicleId
    );
    if (!activeChronicle) {
      throw new UserError("Active chronicle record not found.");
    }

    await this.checkStorytellerAction.execute(ctx, {
      chronicleId: activeChronicle.id,
      chronicleStorytellerRoleIds: activeChronicle.storytellerRoleIds,
    });

    switch (control) {
      case ChronicleControl.OpenCreateModal: {
        return renderEngine.build(CreateChronicleModalRecipe, {
          sessionId: session.id,
        });
      }

      case ChronicleControl.SubmitCreateModal: {
        if (!interaction.isModalSubmit()) {
          throw new RealmError("Expected ModalSubmitInteraction");
        }
        const chronicleName = interaction.fields
          .getTextInputValue("chronicleName")
          .trim();

        if (chronicleName.length < 2 || chronicleName.length > 50) {
          throw new UserError(
            "Chronicle name must be between 2 and 50 characters."
          );
        }

        const created = await this.createChronicleAction.execute({
          discordId: guild.discordId,
          name: chronicleName,
          creatorUserId: userId,
        });

        const nextState: ChronicleSessionStateData = {
          ...session.state,
          activeChronicleId: created.id,
          lastActionBanner: `✨ Created new chronicle **${created.name}**!`,
        };

        const updated = await this.sessionRepo.update(
          session.id,
          { step: ChronicleWorkflowStep.Dashboard, state: nextState },
          ChronicleSessionStateDataSchema
        );

        return this.renderDashboardEnvelope(updated.id, updated.state, created);
      }

      case ChronicleControl.OpenSwitchChronicle: {
        const links = await this.linkRepo.findByDiscordId(guild.discordId);
        const linkedChronicles = await this.chronicleRepo.findManyByIds(
          links.map((l) => l.chronicleId)
        );

        const nextState: ChronicleSessionStateData = {
          ...session.state,
          history: [...session.state.history, ChronicleWorkflowStep.Dashboard],
        };

        const updated = await this.sessionRepo.update(
          session.id,
          {
            step: ChronicleWorkflowStep.SelectActiveChronicle,
            state: nextState,
          },
          ChronicleSessionStateDataSchema
        );

        return renderEngine.build(SelectActiveChronicleRecipe, {
          sessionId: updated.id,
          activeChronicleId: updated.state.activeChronicleId,
          chronicles: linkedChronicles,
        });
      }

      case ChronicleControl.SwitchChronicleMenu: {
        if (!interaction.isStringSelectMenu()) {
          throw new RealmError("Expected StringSelectMenuInteraction");
        }
        const selectedId = interaction.values[0];
        if (!selectedId) {
          throw new UserError("Please select a valid chronicle.");
        }
        const selected = await this.chronicleRepo.findById(selectedId);
        if (!selected) {
          throw new UserError("Selected chronicle not found.");
        }

        const nextState: ChronicleSessionStateData = {
          ...session.state,
          activeChronicleId: selected.id,
          lastActionBanner: `Switched active chronicle to **${selected.name}**.`,
          history: [],
        };

        const updated = await this.sessionRepo.update(
          session.id,
          { step: ChronicleWorkflowStep.Dashboard, state: nextState },
          ChronicleSessionStateDataSchema
        );

        return this.renderDashboardEnvelope(
          updated.id,
          updated.state,
          selected
        );
      }

      case ChronicleControl.OpenVersionMenu: {
        const nextState: ChronicleSessionStateData = {
          ...session.state,
          history: [...session.state.history, ChronicleWorkflowStep.Dashboard],
        };

        const updated = await this.sessionRepo.update(
          session.id,
          { step: ChronicleWorkflowStep.SelectVersion, state: nextState },
          ChronicleSessionStateDataSchema
        );

        return renderEngine.build(SelectVersionRecipe, {
          sessionId: updated.id,
          currentVersion: activeChronicle.defaultVersion,
        });
      }

      case ChronicleControl.SelectVersionMenu: {
        if (!interaction.isStringSelectMenu()) {
          throw new RealmError("Expected StringSelectMenuInteraction");
        }
        const parsedVersion = GameEditionSchema.safeParse(
          interaction.values[0]
        );
        if (!parsedVersion.success) {
          throw new UserError("Invalid game edition selected.");
        }

        const updatedChronicle = await this.chronicleRepo.update({
          id: activeChronicle.id,
          name: activeChronicle.name,
          defaultVersion: parsedVersion.data,
        });

        const nextState: ChronicleSessionStateData = {
          ...session.state,
          lastActionBanner: `Updated default game edition to **${parsedVersion.data}**.`,
          history: [],
        };

        const updated = await this.sessionRepo.update(
          session.id,
          { step: ChronicleWorkflowStep.Dashboard, state: nextState },
          ChronicleSessionStateDataSchema
        );

        return this.renderDashboardEnvelope(
          updated.id,
          updated.state,
          updatedChronicle
        );
      }

      case ChronicleControl.OpenStorytellers: {
        const nextState: ChronicleSessionStateData = {
          ...session.state,
          history: [...session.state.history, ChronicleWorkflowStep.Dashboard],
        };

        const updated = await this.sessionRepo.update(
          session.id,
          {
            step: ChronicleWorkflowStep.ManageStorytellers,
            state: nextState,
          },
          ChronicleSessionStateDataSchema
        );

        const stDiscordIds = await this.getChronicleStorytellerDiscordIds(
          activeChronicle.id
        );

        return renderEngine.build(ManageStorytellersRecipe, {
          sessionId: updated.id,
          activeChronicle,
          storytellerDiscordIds: stDiscordIds,
        });
      }

      case ChronicleControl.AddStorytellerRoleMenu: {
        if (!interaction.isRoleSelectMenu()) {
          throw new RealmError("Expected RoleSelectMenuInteraction");
        }
        const selectedRoleId = interaction.values[0];
        if (!selectedRoleId) {
          throw new UserError("Please select a role.");
        }

        const existingRoles = activeChronicle.storytellerRoleIds;
        const exists = existingRoles.includes(selectedRoleId);
        const updatedRoles = exists
          ? existingRoles.filter((r) => r !== selectedRoleId)
          : [...existingRoles, selectedRoleId];

        const updatedChronicle = await this.chronicleRepo.update({
          id: activeChronicle.id,
          name: activeChronicle.name,
          storytellerRoleIds: updatedRoles,
        });

        const bannerText = exists
          ? `Removed Storyteller role <@&${selectedRoleId}>.`
          : `Added Storyteller role <@&${selectedRoleId}>.`;

        const nextState: ChronicleSessionStateData = {
          ...session.state,
          lastActionBanner: bannerText,
        };

        await this.sessionRepo.update(
          session.id,
          { state: nextState },
          ChronicleSessionStateDataSchema
        );

        const stDiscordIds = await this.getChronicleStorytellerDiscordIds(
          updatedChronicle.id
        );

        return renderEngine.build(ManageStorytellersRecipe, {
          sessionId: session.id,
          activeChronicle: updatedChronicle,
          storytellerDiscordIds: stDiscordIds,
        });
      }

      case ChronicleControl.AddStorytellerUserMenu: {
        if (!interaction.isUserSelectMenu()) {
          throw new RealmError("Expected UserSelectMenuInteraction");
        }
        const selectedDiscordId = interaction.values[0];
        if (!selectedDiscordId) {
          throw new UserError("Please select a user.");
        }

        const targetUser = await this.resolveTargetUser(
          interaction,
          selectedDiscordId
        );

        const isCurrentlySt = await this.storytellerRepo.check(
          activeChronicle.id,
          targetUser.id
        );

        if (isCurrentlySt) {
          await this.storytellerRepo.revokeAllForUser(
            activeChronicle.id,
            targetUser.id
          );
        } else {
          await this.storytellerRepo.grant({
            userId: targetUser.id,
            chronicleId: activeChronicle.id,
            provider: guild.discordId,
          });
        }

        const bannerText = isCurrentlySt
          ? `Revoked Storyteller status from <@${selectedDiscordId}>.`
          : `Granted Storyteller status to <@${selectedDiscordId}>.`;

        const nextState: ChronicleSessionStateData = {
          ...session.state,
          lastActionBanner: bannerText,
        };

        await this.sessionRepo.update(
          session.id,
          { state: nextState },
          ChronicleSessionStateDataSchema
        );

        const stDiscordIds = await this.getChronicleStorytellerDiscordIds(
          activeChronicle.id
        );

        return renderEngine.build(ManageStorytellersRecipe, {
          sessionId: session.id,
          activeChronicle,
          storytellerDiscordIds: stDiscordIds,
        });
      }

      case ChronicleControl.OpenDeleteConfirm: {
        const links = await this.linkRepo.findByDiscordId(guild.discordId);
        const isLastChronicle = links.length <= 1;

        const nextState: ChronicleSessionStateData = {
          ...session.state,
          history: [...session.state.history, ChronicleWorkflowStep.Dashboard],
        };

        const updated = await this.sessionRepo.update(
          session.id,
          { step: ChronicleWorkflowStep.ConfirmDelete, state: nextState },
          ChronicleSessionStateDataSchema
        );

        return renderEngine.build(ConfirmDeleteChronicleRecipe, {
          sessionId: updated.id,
          chronicle: activeChronicle,
          isLastChronicle,
        });
      }

      case ChronicleControl.ConfirmDeleteCancel: {
        const nextState: ChronicleSessionStateData = {
          ...session.state,
          history: [],
        };

        const updated = await this.sessionRepo.update(
          session.id,
          { step: ChronicleWorkflowStep.Dashboard, state: nextState },
          ChronicleSessionStateDataSchema
        );

        return this.renderDashboardEnvelope(
          updated.id,
          updated.state,
          activeChronicle
        );
      }

      case ChronicleControl.ConfirmDeleteYes: {
        const deleteResult = await this.deleteChronicleAction.execute({
          discordId: guild.discordId,
          chronicleId: activeChronicle.id,
          guildName: interaction.guild.name,
          guildIconUrl: interaction.guild.iconURL() ?? undefined,
          userId,
        });

        const bannerText = deleteResult.reconstituted
          ? `🗑️ Deleted **${activeChronicle.name}**. As this was the only chronicle, a new default chronicle **${deleteResult.activeChronicle.name}** was created automatically.`
          : `🗑️ Deleted chronicle **${activeChronicle.name}**.`;

        const nextState: ChronicleSessionStateData = {
          ...session.state,
          activeChronicleId: deleteResult.activeChronicle.id,
          lastActionBanner: bannerText,
          history: [],
        };

        const updated = await this.sessionRepo.update(
          session.id,
          { step: ChronicleWorkflowStep.Dashboard, state: nextState },
          ChronicleSessionStateDataSchema
        );

        return this.renderDashboardEnvelope(
          updated.id,
          updated.state,
          deleteResult.activeChronicle
        );
      }

      case ChronicleControl.NavBack: {
        const history = [...session.state.history];
        const previousStep = history.pop() ?? ChronicleWorkflowStep.Dashboard;

        const nextState: ChronicleSessionStateData = {
          ...session.state,
          history,
        };

        const updated = await this.sessionRepo.update(
          session.id,
          { step: previousStep, state: nextState },
          ChronicleSessionStateDataSchema
        );

        return this.renderDashboardEnvelope(
          updated.id,
          updated.state,
          activeChronicle
        );
      }

      default:
        throw new RealmError("Unknown chronicle interaction control", {
          fields: { control: control ?? "undefined" },
        });
    }
  }

  /**
   * Helper to build and render the Dashboard recipe with fresh metadata counts.
   */
  private async renderDashboardEnvelope(
    sessionId: Snowflake,
    state: ChronicleSessionStateData,
    chronicle: ChronicleData
  ): Promise<NormalizedRenderEnvelope> {
    const links = await this.linkRepo.findByDiscordId(state.guildId);
    const stUsers = await this.storytellerRepo.findByChronicle(chronicle.id);

    return renderEngine.build(ChronicleDashboardRecipe, {
      sessionId,
      state,
      activeChronicle: chronicle,
      linkedChroniclesCount: links.length,
      storytellerUsersCount: stUsers.length,
    });
  }
}

/**
 * Singleton instance automatically picked up by Loader.
 */
export const chronicleCoordinator = new ChronicleCoordinator();
