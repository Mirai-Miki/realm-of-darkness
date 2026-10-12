import { Collection } from "discord.js";
import { RealmError } from "@realm/common";
import { User } from "@realm/core";
import { CreateGuildAction, GuildSyncAction } from "../src/features/guild";
import {
  ensureActor,
  ensureActorMiddleware,
  ensureGuildContext,
  ensureGuildContextMiddleware,
} from "../src/framework";
import type { BaseInteraction, Guild, GuildMember } from "discord.js";
import type {
  ChronicleData,
  ChronicleMemberData,
  DiscordGuildChronicleData,
  DiscordGuildData,
  IChronicleMemberRepository,
  IChronicleRepository,
  IDiscordGuildChronicleRepository,
  IDiscordGuildRepository,
  IUserRepository,
  UserData,
} from "@realm/common";
import type { BaseInteractionContext } from "../src/framework";

describe("Discord Guild, Chronicle & User Synchronization", () => {
  const guildId = "111111111111111111";
  const chronicleId = "222222222222222222";
  const userId = "333333333333333333";
  const discordUserId = "444444444444444444";
  const leaverUserId = "555555555555555555";
  const leaverDiscordId = "666666666666666666";
  const now = new Date("2026-01-01T00:00:00.000Z");

  const sampleGuildData: DiscordGuildData = {
    discordId: guildId,
    name: "Elysium Server",
    iconUrl: "https://cdn.discordapp.com/icons/111/icon.png",
    storytellerRoleIds: [],
    createdAt: now,
    lastUpdated: now,
  };

  const sampleChronicleData: ChronicleData = {
    id: chronicleId,
    name: "Elysium Server",
    iconUrl: "https://cdn.discordapp.com/icons/111/icon.png",
    createdAt: now,
    lastUpdated: now,
  };

  const sampleLinkData: DiscordGuildChronicleData = {
    discordId: guildId,
    chronicleId,
    createdAt: now,
    lastUpdated: now,
  };

  const sampleUserData: UserData = {
    id: userId,
    discordId: discordUserId,
    displayName: "Miki",
    avatarUrl: "https://cdn.discordapp.com/avatars/444/avatar.png",
    admin: false,
    createdAt: now,
    updatedAt: now,
  };

  const sampleMemberData: ChronicleMemberData = {
    chronicleId,
    userId,
    isStoryteller: false,
    boosted: 0,
    nickname: "Miki",
    avatarUrl: "https://cdn.discordapp.com/avatars/444/avatar.png",
    createdAt: now,
    lastUpdated: now,
  };

  const createMockGuild = (overrides?: {
    id?: string;
    name?: string;
    available?: boolean;
  }): Guild =>
    ({
      id: guildId,
      name: "Elysium Server",
      available: true,
      iconURL: jest
        .fn()
        .mockReturnValue("https://cdn.discordapp.com/icons/111/icon.png"),
      members: {
        fetch: jest.fn(),
      },
      ...overrides,
    }) as unknown as Guild;

  const createMockRepositories = (): {
    guildRepo: jest.Mocked<IDiscordGuildRepository>;
    linkRepo: jest.Mocked<IDiscordGuildChronicleRepository>;
    chronicleRepo: jest.Mocked<IChronicleRepository>;
    memberRepo: jest.Mocked<IChronicleMemberRepository>;
    userRepo: jest.Mocked<IUserRepository>;
  } => ({
    guildRepo: {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn().mockResolvedValue(sampleGuildData),
      delete: jest.fn(),
      exists: jest.fn(),
    },
    linkRepo: {
      link: jest.fn().mockResolvedValue(sampleLinkData),
      unlink: jest.fn(),
      findByDiscordId: jest.fn().mockResolvedValue([]),
      findByChronicleId: jest.fn().mockResolvedValue([sampleLinkData]),
    },
    chronicleRepo: {
      findById: jest.fn(),
      findAllIds: jest.fn(),
      create: jest.fn().mockResolvedValue(sampleChronicleData),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    },
    memberRepo: {
      findByChronicleAndUser: jest.fn(),
      findByChronicle: jest.fn(),
      findIdsByChronicle: jest.fn().mockResolvedValue([]),
      findByUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn().mockResolvedValue(sampleMemberData),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteByChronicle: jest.fn(),
      exists: jest.fn(),
      countByChronicle: jest.fn(),
      findStorytellersByChronicle: jest.fn(),
      findBoostingMembers: jest.fn(),
      countTotalBoostsByUser: jest.fn(),
    },
    userRepo: {
      findById: jest.fn(),
      findManyByIds: jest.fn().mockResolvedValue([]),
      findByDiscordId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      upsertFromDiscordProfile: jest.fn().mockResolvedValue(sampleUserData),
      delete: jest.fn(),
      exists: jest.fn(),
      count: jest.fn(),
    },
  });

  describe("CreateGuildAction (Decoupled Guild vs Chronicle Lifecycle)", () => {
    it("should upsert DiscordGuild, create default Chronicle, and link them when no links exist", async () => {
      const { guildRepo, linkRepo, chronicleRepo } = createMockRepositories();
      linkRepo.findByDiscordId.mockResolvedValueOnce([]);

      const action = new CreateGuildAction(guildRepo, linkRepo, chronicleRepo);
      const mockGuild = createMockGuild();

      const result = await action.execute(mockGuild);

      expect(guildRepo.upsert).toHaveBeenCalledWith({
        discordId: guildId,
        name: "Elysium Server",
        iconUrl: "https://cdn.discordapp.com/icons/111/icon.png",
      });
      expect(chronicleRepo.create).toHaveBeenCalledWith({
        name: "Elysium Server",
        iconUrl: "https://cdn.discordapp.com/icons/111/icon.png",
      });
      expect(linkRepo.link).toHaveBeenCalledWith({
        discordId: guildId,
        chronicleId,
      });
      expect(result).toEqual({
        guildData: sampleGuildData,
        chronicleLinks: [sampleLinkData],
      });
    });

    it("should refresh DiscordGuild metadata without creating or overwriting Chronicle when links already exist", async () => {
      const { guildRepo, linkRepo, chronicleRepo } = createMockRepositories();
      linkRepo.findByDiscordId.mockResolvedValueOnce([sampleLinkData]);

      const action = new CreateGuildAction(guildRepo, linkRepo, chronicleRepo);
      const renamedGuild = createMockGuild({ name: "Renamed Discord Server" });

      const result = await action.execute(renamedGuild);

      expect(guildRepo.upsert).toHaveBeenCalledWith({
        discordId: guildId,
        name: "Renamed Discord Server",
        iconUrl: "https://cdn.discordapp.com/icons/111/icon.png",
      });
      // Must NOT create a second Chronicle or overwrite Chronicle name
      expect(chronicleRepo.create).not.toHaveBeenCalled();
      expect(chronicleRepo.update).not.toHaveBeenCalled();
      expect(linkRepo.link).not.toHaveBeenCalled();
      expect(result.chronicleLinks).toEqual([sampleLinkData]);
    });
  });

  describe("GuildSyncAction", () => {
    it("should skip unavailable guilds, create untracked guilds, and cleanup departed members on tracked guilds", async () => {
      const { guildRepo, linkRepo, chronicleRepo, memberRepo, userRepo } =
        createMockRepositories();

      const createGuildAction = new CreateGuildAction(
        guildRepo,
        linkRepo,
        chronicleRepo
      );
      const syncAction = new GuildSyncAction(
        guildRepo,
        memberRepo,
        userRepo,
        linkRepo,
        createGuildAction
      );

      const unavailableGuild = createMockGuild({
        id: "999999999999999999",
        available: false,
      });

      const activeGuild = createMockGuild({ id: guildId });
      // Mock guild.members.fetch returning only discordUserId (leaverDiscordId has left)
      const fetchedMembers = new Collection<string, GuildMember>();
      fetchedMembers.set(discordUserId, {} as unknown as GuildMember);
      (activeGuild.members.fetch as jest.Mock).mockResolvedValue(
        fetchedMembers
      );

      guildRepo.exists.mockResolvedValueOnce(true);
      linkRepo.findByDiscordId.mockResolvedValue([sampleLinkData]);
      linkRepo.findByChronicleId.mockResolvedValue([sampleLinkData]);
      memberRepo.findIdsByChronicle.mockResolvedValue([userId, leaverUserId]);
      userRepo.findManyByIds.mockResolvedValue([
        sampleUserData,
        {
          ...sampleUserData,
          id: leaverUserId,
          discordId: leaverDiscordId,
        },
      ]);

      const guildsCollection = new Collection<string, Guild>();
      guildsCollection.set(unavailableGuild.id, unavailableGuild);
      guildsCollection.set(activeGuild.id, activeGuild);

      const summary = await syncAction.execute(guildsCollection);

      expect(summary).toEqual({ syncedCount: 1, failedCount: 0 });
      // Active member kept, departed member removed
      expect(memberRepo.delete).toHaveBeenCalledTimes(1);
      expect(memberRepo.delete).toHaveBeenCalledWith(chronicleId, leaverUserId);
    });

    it("should skip member cleanup when a Chronicle is shared across multiple Discord guilds", async () => {
      const { guildRepo, linkRepo, chronicleRepo, memberRepo, userRepo } =
        createMockRepositories();

      const createGuildAction = new CreateGuildAction(
        guildRepo,
        linkRepo,
        chronicleRepo
      );
      const syncAction = new GuildSyncAction(
        guildRepo,
        memberRepo,
        userRepo,
        linkRepo,
        createGuildAction
      );

      const activeGuild = createMockGuild({ id: guildId });
      guildRepo.exists.mockResolvedValueOnce(true);
      linkRepo.findByDiscordId.mockResolvedValue([sampleLinkData]);
      // Linked to 2 guilds
      linkRepo.findByChronicleId.mockResolvedValue([
        sampleLinkData,
        { ...sampleLinkData, discordId: "777777777777777777" },
      ]);

      const guildsCollection = new Collection<string, Guild>();
      guildsCollection.set(activeGuild.id, activeGuild);

      const summary = await syncAction.execute(guildsCollection);

      expect(summary).toEqual({ syncedCount: 1, failedCount: 0 });
      expect(memberRepo.findIdsByChronicle).not.toHaveBeenCalled();
    });
  });

  describe("ensureActor & ensureActorMiddleware", () => {
    const createMockContext = (
      guild?: Guild
    ): BaseInteractionContext<BaseInteraction> => ({
      interaction: {
        user: {
          id: discordUserId,
          displayName: "Miki",
          displayAvatarURL: () =>
            "https://cdn.discordapp.com/avatars/444/avatar.png",
        },
        guild: guild ?? null,
        member: guild
          ? {
              displayName: "Miki Guild Nick",
              displayAvatarURL: () =>
                "https://cdn.discordapp.com/avatars/444/guild.png",
              premiumSince: null,
            }
          : null,
      } as unknown as BaseInteraction,
    });

    it("should upsert user from Discord profile and attach ctx.actor", async () => {
      const { userRepo } = createMockRepositories();
      const ctx = createMockContext();
      const next = jest.fn().mockResolvedValue(undefined);

      const middleware = ensureActorMiddleware(userRepo);
      await middleware(ctx, next);

      expect(userRepo.upsertFromDiscordProfile).toHaveBeenCalledWith({
        discordId: discordUserId,
        displayName: "Miki",
        avatarUrl: "https://cdn.discordapp.com/avatars/444/avatar.png",
      });
      expect(ctx.actor).toBeInstanceOf(User);
      expect(ctx.actor?.id).toBe(userId);
      expect(next).toHaveBeenCalled();
    });

    it("should recover from a nested PG 23505 unique constraint violation by re-fetching user", async () => {
      const { userRepo } = createMockRepositories();

      // Simulate RealmError -> DrizzleQueryError -> pg.DatabaseError (code: "23505")
      const pgUniqueError = Object.assign(
        new Error("duplicate key value violates unique constraint"),
        { code: "23505" }
      );
      const drizzleError = new Error("Failed query: insert into users...", {
        cause: pgUniqueError,
      });
      const wrappedError = new RealmError(
        "Failed to upsert user from Discord profile",
        { cause: drizzleError }
      );

      userRepo.upsertFromDiscordProfile.mockRejectedValueOnce(wrappedError);
      userRepo.findByDiscordId.mockResolvedValueOnce(sampleUserData);

      const ctx = createMockContext();
      const actor = await ensureActor(ctx, userRepo);

      expect(userRepo.findByDiscordId).toHaveBeenCalledWith(discordUserId);
      expect(actor.id).toBe(userId);
    });
  });

  describe("ensureGuildContext & ensureGuildContextMiddleware", () => {
    it("should synchronize guild, default chronicle link, and actor ChronicleMember on guild interaction", async () => {
      const { guildRepo, linkRepo, chronicleRepo, memberRepo } =
        createMockRepositories();
      linkRepo.findByDiscordId.mockResolvedValueOnce([sampleLinkData]);

      const mockGuild = createMockGuild();
      const ctx: BaseInteractionContext<BaseInteraction> = {
        interaction: {
          user: {
            id: discordUserId,
            displayName: "Miki",
            displayAvatarURL: () =>
              "https://cdn.discordapp.com/avatars/444/avatar.png",
          },
          guild: mockGuild,
          member: {
            displayName: "Storyteller Miki",
            displayAvatarURL: () =>
              "https://cdn.discordapp.com/avatars/444/guild.png",
            premiumSince: new Date(),
          },
        } as unknown as BaseInteraction,
        actor: new User(sampleUserData),
      };

      const next = jest.fn().mockResolvedValue(undefined);
      const middleware = ensureGuildContextMiddleware({
        guildRepo,
        linkRepo,
        chronicleRepo,
        memberRepo,
      });

      await middleware(ctx, next);

      expect(ctx.guild?.discordId).toBe(guildId);
      expect(ctx.chronicleIds).toEqual([chronicleId]);
      expect(memberRepo.upsert).toHaveBeenCalledWith({
        chronicleId,
        userId,
        nickname: "Storyteller Miki",
        avatarUrl: "https://cdn.discordapp.com/avatars/444/guild.png",
        boosted: 1,
      });
      expect(ctx.memberships).toHaveLength(1);
      expect(next).toHaveBeenCalled();
    });

    it("should be a no-op when interaction occurs in a DM (no guild)", async () => {
      const { guildRepo, linkRepo, chronicleRepo, memberRepo } =
        createMockRepositories();

      const ctx: BaseInteractionContext<BaseInteraction> = {
        interaction: {
          user: {
            id: discordUserId,
            displayName: "Miki",
            displayAvatarURL: () =>
              "https://cdn.discordapp.com/avatars/444/avatar.png",
          },
          guild: null,
        } as unknown as BaseInteraction,
        actor: new User(sampleUserData),
      };

      await ensureGuildContext(ctx, {
        guildRepo,
        linkRepo,
        chronicleRepo,
        memberRepo,
      });

      expect(guildRepo.upsert).not.toHaveBeenCalled();
      expect(ctx.guild).toBeUndefined();
      expect(ctx.chronicleIds).toBeUndefined();
      expect(ctx.memberships).toBeUndefined();
    });
  });
});
