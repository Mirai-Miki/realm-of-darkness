import { PermissionsBitField } from "discord.js";
import { UserError } from "@realm/common";
import { CheckStorytellerPermissionAction } from "../src/features/chronicle/actions/check-storyteller-permission.action";
import type { BaseInteractionContext } from "../src/framework";
import type {
  DiscordGuildData,
  IStorytellerRepository,
  UserData,
} from "@realm/common";
import type { BaseInteraction, GuildMember } from "discord.js";

describe("CheckStorytellerPermissionAction", () => {
  const guildId = "111111111111111111";
  const chronicleId = "222222222222222222";
  const userId = "333333333333333333";
  const now = new Date("2026-01-01T00:00:00.000Z");

  const serverStRoleId = "888888888888888888";
  const chronicleStRoleId = "999999999999999999";

  const sampleGuildData: DiscordGuildData = {
    discordId: guildId,
    name: "Test Guild",
    iconUrl: "https://cdn.discordapp.com/icons/111/icon.png",
    storytellerRoleIds: [serverStRoleId],
    createdAt: now,
    lastUpdated: now,
  };

  const sampleActor: UserData = {
    id: userId,
    discordId: "123456789012345678",
    displayName: "Test User",
    avatarUrl: "https://cdn.discordapp.com/avatars/123/avatar.png",
    admin: false,
    createdAt: now,
    updatedAt: now,
  };

  let mockStorytellerRepo: jest.Mocked<IStorytellerRepository>;

  beforeEach(() => {
    mockStorytellerRepo = {
      grant: jest.fn().mockResolvedValue({
        id: "777777777777777777",
        userId,
        chronicleId,
        provider: guildId,
        createdAt: now,
      }),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
      check: jest.fn().mockResolvedValue(false),
      getProviders: jest.fn().mockResolvedValue([]),
      findByChronicle: jest.fn().mockResolvedValue([]),
    };
  });

  /**
   * Helper to build a minimal mocked interaction context for permission checks.
   */
  function buildMockContext(overrides: {
    roleIds?: string[];
    permissions?: bigint;
    isOwner?: boolean;
    hasActor?: boolean;
    hasGuild?: boolean;
    hasMember?: boolean;
  }): BaseInteractionContext<BaseInteraction> {
    const roleIds = overrides.roleIds ?? [];
    const permissions =
      overrides.permissions !== undefined
        ? overrides.permissions.toString()
        : "0";

    const member =
      overrides.hasMember === false
        ? null
        : ({
            roles: roleIds,
            permissions,
            user: { id: overrides.isOwner ? "owner_user_id" : "some_user_id" },
          } as unknown as GuildMember);

    const interaction = {
      member,
      user: { id: "some_user_id" },
      guild: {
        id: guildId,
        ownerId: "owner_user_id",
      },
    } as unknown as BaseInteraction;

    return {
      interaction,
      actor: overrides.hasActor === false ? null : sampleActor,
      guild: overrides.hasGuild === false ? null : sampleGuildData,
      chronicles: [],
    } as unknown as BaseInteractionContext<BaseInteraction>;
  }

  it("should return true when user holds a server-wide Storyteller role", async () => {
    const action = new CheckStorytellerPermissionAction(mockStorytellerRepo);
    const ctx = buildMockContext({ roleIds: [serverStRoleId] });

    const result = await action.execute(ctx, { chronicleId });
    expect(result).toBe(true);
    expect(mockStorytellerRepo.check).not.toHaveBeenCalled();
  });

  it("should return true when user holds a chronicle-specific Storyteller role", async () => {
    const action = new CheckStorytellerPermissionAction(mockStorytellerRepo);
    const ctx = buildMockContext({ roleIds: [chronicleStRoleId] });

    const result = await action.execute(ctx, {
      chronicleId,
      chronicleStorytellerRoleIds: [chronicleStRoleId],
    });
    expect(result).toBe(true);
    expect(mockStorytellerRepo.check).not.toHaveBeenCalled();
  });

  it("should return true when user has an explicit DB storyteller grant", async () => {
    mockStorytellerRepo.check.mockResolvedValue(true);
    const action = new CheckStorytellerPermissionAction(mockStorytellerRepo);
    const ctx = buildMockContext({ roleIds: [] });

    const result = await action.execute(ctx, { chronicleId });
    expect(result).toBe(true);
    expect(mockStorytellerRepo.check).toHaveBeenCalledWith(chronicleId, userId);
  });

  it("should return true and auto-grant DB storyteller record when user is Discord Administrator", async () => {
    const action = new CheckStorytellerPermissionAction(mockStorytellerRepo);
    const ctx = buildMockContext({
      roleIds: [],
      permissions: PermissionsBitField.Flags.Administrator,
    });

    const result = await action.execute(ctx, { chronicleId });
    expect(result).toBe(true);
    // Verifies auto-grant to PostgreSQL so web client recognizes the admin as storyteller
    expect(mockStorytellerRepo.grant).toHaveBeenCalledWith({
      userId,
      chronicleId,
      provider: guildId,
    });
  });

  it("should return true when user is the Guild Owner", async () => {
    const action = new CheckStorytellerPermissionAction(mockStorytellerRepo);
    const ctx = buildMockContext({
      roleIds: [],
      isOwner: true,
    });

    const result = await action.execute(ctx, { chronicleId });
    expect(result).toBe(true);
  });

  it("should throw UserError when user is unauthorized", async () => {
    const action = new CheckStorytellerPermissionAction(mockStorytellerRepo);
    const ctx = buildMockContext({ roleIds: [] });

    await expect(action.execute(ctx, { chronicleId })).rejects.toThrow(
      UserError
    );
  });

  it("should return false from isStoryteller when member or guild is missing", async () => {
    const action = new CheckStorytellerPermissionAction(mockStorytellerRepo);
    const ctxWithoutMember = buildMockContext({ hasMember: false });
    const isSt1 = await action.isStoryteller(ctxWithoutMember);
    expect(isSt1).toBe(false);

    const ctxWithoutGuild = buildMockContext({ hasGuild: false });
    const isSt2 = await action.isStoryteller(ctxWithoutGuild);
    expect(isSt2).toBe(false);
  });
});
