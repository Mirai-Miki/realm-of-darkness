import {
  DiscordGuildChronicleRepository,
  DiscordGuildRepository,
  InteractionSessionRepository,
  StorytellerRepository,
  UserRepository,
} from "@realm/repositories";
import { RealmError, UserError } from "@realm/common";
import {
  Coordinator,
  buildSlashCommandFromMdx,
  decodeSessionCustomId,
} from "../../framework";
import { renderEngine } from "../../ui";
import { CheckStorytellerPermissionAction } from "../chronicle/actions";
import {
  GUILD_HANDLER_ID,
  GuildDashboardRecipe,
  ManageGuildStorytellersRecipe,
} from "./guild.recipes";
import {
  GuildControl,
  GuildSessionStateDataSchema,
  GuildWorkflowStep,
} from "./guild-session.definitions";
import type { UserSelectMenuInteraction } from "discord.js";
import type { CommandContext, InterfaceContext } from "../../framework";
import type {
  DiscordGuildData,
  IDiscordGuildChronicleRepository,
  IDiscordGuildRepository,
  IStorytellerRepository,
  IUserRepository,
  Snowflake,
  UserData,
} from "@realm/common";
import type { NormalizedRenderEnvelope } from "../../ui";
import type { GuildSessionStateData } from "./guild-session.definitions";

/**
 * Unified Coordinator for the `/guild` command and interactive server settings.
 */
export class GuildCoordinator extends Coordinator {
  public readonly data = buildSlashCommandFromMdx(GUILD_HANDLER_ID);

  private readonly sessionRepo: InteractionSessionRepository;
  private readonly guildRepo: IDiscordGuildRepository;
  private readonly linkRepo: IDiscordGuildChronicleRepository;
  private readonly storytellerRepo: IStorytellerRepository;
  private readonly userRepo: IUserRepository;
  private readonly checkStorytellerAction: CheckStorytellerPermissionAction;

  /**
   * Creates a new `GuildCoordinator` instance.
   */
  constructor(
    sessionRepo?: InteractionSessionRepository,
    guildRepo?: IDiscordGuildRepository,
    linkRepo?: IDiscordGuildChronicleRepository,
    storytellerRepo?: IStorytellerRepository,
    userRepo?: IUserRepository
  ) {
    super();
    this.sessionRepo = sessionRepo ?? new InteractionSessionRepository();
    this.guildRepo = guildRepo ?? new DiscordGuildRepository();
    this.linkRepo = linkRepo ?? new DiscordGuildChronicleRepository();
    this.storytellerRepo = storytellerRepo ?? new StorytellerRepository();
    this.userRepo = userRepo ?? new UserRepository();
    this.checkStorytellerAction = new CheckStorytellerPermissionAction(
      this.storytellerRepo
    );
  }

  /**
   * Resolves a selected Discord user into an RoD user record, inserting them if they have never interacted before.
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
   * Retrieves the Discord Snowflake IDs for all server-wide storytellers.
   */
  private async getServerStorytellerDiscordIds(
    guildDiscordId: Snowflake
  ): Promise<Snowflake[]> {
    const links = await this.linkRepo.findByDiscordId(guildDiscordId);
    if (links.length === 0) {
      return [];
    }
    const allGrants = await Promise.all(
      links.map((l) => this.storytellerRepo.findByChronicle(l.chronicleId))
    );
    const guildGrants = allGrants
      .flat()
      .filter((g) => g.provider === guildDiscordId || g.provider === "hoisted");

    const userIds = [...new Set(guildGrants.map((g) => g.userId))];
    if (userIds.length === 0) {
      return [];
    }
    const users = await this.userRepo.findManyByIds(userIds);
    return users
      .map((u) => u?.discordId)
      .filter((id): id is string => Boolean(id));
  }

  /**
   * Executes the `/guild` slash command.
   */
  public async execute(ctx: CommandContext): Promise<NormalizedRenderEnvelope> {
    const { interaction, guild, actor } = ctx;

    if (!interaction.guild || !guild) {
      throw new UserError(
        "The /guild command can only be used within a Discord server."
      );
    }

    // Verify Storyteller status
    await this.checkStorytellerAction.execute(ctx);

    const userId = actor?.id ?? interaction.user.id;
    const initialState: GuildSessionStateData = {
      guildId: guild.discordId,
      history: [],
    };

    const session = await this.sessionRepo.create(
      {
        userId,
        handlerId: this.handlerId,
        step: GuildWorkflowStep.Dashboard,
        state: initialState,
      },
      GuildSessionStateDataSchema
    );

    return this.renderDashboardEnvelope(
      session.id,
      session.state,
      guild.toData()
    );
  }

  /**
   * Handles component and modal interactions for `/guild`.
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
      GuildSessionStateDataSchema,
      userId
    );

    await this.checkStorytellerAction.execute(ctx);

    const guildRecord = await this.guildRepo.findById(guild.discordId);
    if (!guildRecord) {
      throw new UserError("Guild record not found.");
    }

    switch (control) {
      case GuildControl.OpenStorytellers: {
        const nextState: GuildSessionStateData = {
          ...session.state,
          history: [...session.state.history, GuildWorkflowStep.Dashboard],
        };

        const updated = await this.sessionRepo.update(
          session.id,
          { step: GuildWorkflowStep.ManageStorytellers, state: nextState },
          GuildSessionStateDataSchema
        );

        const storytellerDiscordIds = await this.getServerStorytellerDiscordIds(
          guild.discordId
        );

        return renderEngine.build(ManageGuildStorytellersRecipe, {
          sessionId: updated.id,
          guildData: guildRecord,
          storytellerDiscordIds,
        });
      }

      case GuildControl.AddServerRoleMenu: {
        if (!interaction.isRoleSelectMenu()) {
          throw new RealmError("Expected RoleSelectMenuInteraction");
        }
        const selectedRoleId = interaction.values[0];
        if (!selectedRoleId) {
          throw new UserError("Please select a role.");
        }

        const existingRoles = guildRecord.storytellerRoleIds;
        const exists = existingRoles.includes(selectedRoleId);
        const updatedRoles = exists
          ? existingRoles.filter((r) => r !== selectedRoleId)
          : [...existingRoles, selectedRoleId];

        const updatedGuild = await this.guildRepo.update({
          discordId: guildRecord.discordId,
          name: guildRecord.name,
          storytellerRoleIds: updatedRoles,
        });

        const bannerText = exists
          ? `Removed server-wide Storyteller role <@&${selectedRoleId}>.`
          : `Added server-wide Storyteller role <@&${selectedRoleId}>.`;

        const nextState: GuildSessionStateData = {
          ...session.state,
          lastActionBanner: bannerText,
        };

        await this.sessionRepo.update(
          session.id,
          { state: nextState },
          GuildSessionStateDataSchema
        );

        const storytellerDiscordIds = await this.getServerStorytellerDiscordIds(
          guild.discordId
        );

        return renderEngine.build(ManageGuildStorytellersRecipe, {
          sessionId: session.id,
          guildData: updatedGuild,
          storytellerDiscordIds,
        });
      }

      case GuildControl.AddServerUserMenu: {
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

        // Check against first linked chronicle
        const links = await this.linkRepo.findByDiscordId(guild.discordId);
        if (links.length === 0) {
          throw new UserError("No chronicle linked to server.");
        }
        const chronicleId = links[0]?.chronicleId;
        if (!chronicleId) {
          throw new UserError("No valid chronicle linked to server.");
        }

        const isCurrentlySt = await this.storytellerRepo.check(
          chronicleId,
          targetUser.id
        );

        if (isCurrentlySt) {
          await Promise.all(
            links.map((link) =>
              this.storytellerRepo.revokeAllForUser(
                link.chronicleId,
                targetUser.id
              )
            )
          );
        } else {
          await Promise.all(
            links.map((link) =>
              this.storytellerRepo.grant({
                userId: targetUser.id,
                chronicleId: link.chronicleId,
                provider: guild.discordId,
              })
            )
          );
        }

        const bannerText = isCurrentlySt
          ? `Revoked server Storyteller status from <@${selectedDiscordId}>.`
          : `Granted server Storyteller status to <@${selectedDiscordId}>.`;

        const nextState: GuildSessionStateData = {
          ...session.state,
          lastActionBanner: bannerText,
        };

        await this.sessionRepo.update(
          session.id,
          { state: nextState },
          GuildSessionStateDataSchema
        );

        const storytellerDiscordIds = await this.getServerStorytellerDiscordIds(
          guild.discordId
        );

        return renderEngine.build(ManageGuildStorytellersRecipe, {
          sessionId: session.id,
          guildData: guildRecord,
          storytellerDiscordIds,
        });
      }

      case GuildControl.NavBack: {
        const history = [...session.state.history];
        const previousStep = history.pop() ?? GuildWorkflowStep.Dashboard;

        const nextState: GuildSessionStateData = {
          ...session.state,
          history,
        };

        const updated = await this.sessionRepo.update(
          session.id,
          { step: previousStep, state: nextState },
          GuildSessionStateDataSchema
        );

        return this.renderDashboardEnvelope(
          updated.id,
          updated.state,
          guildRecord
        );
      }

      default:
        throw new RealmError("Unknown guild interaction control", {
          fields: { control: control ?? "undefined" },
        });
    }
  }

  private async renderDashboardEnvelope(
    sessionId: Snowflake,
    state: GuildSessionStateData,
    guildData: DiscordGuildData
  ): Promise<NormalizedRenderEnvelope> {
    const links = await this.linkRepo.findByDiscordId(state.guildId);
    const storytellerDiscordIds = await this.getServerStorytellerDiscordIds(
      state.guildId
    );

    return renderEngine.build(GuildDashboardRecipe, {
      sessionId,
      state,
      guildData,
      storytellerDiscordIds,
      linkedChroniclesCount: links.length,
    });
  }
}

/**
 * Singleton instance automatically picked up by Loader.
 */
export const guildCoordinator = new GuildCoordinator();
