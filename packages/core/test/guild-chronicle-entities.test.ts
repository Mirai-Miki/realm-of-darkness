import {
  ChronicleDataSchema,
  ChronicleMemberDataSchema,
  DiscordGuildDataSchema,
  RealmError,
  UserDataSchema,
} from "@realm/common";
import { Chronicle, ChronicleMember, DiscordGuild, User } from "../src";
import type {
  ChronicleData,
  ChronicleMemberData,
  DiscordGuildData,
  UserData,
} from "@realm/common";

describe("Guild, Chronicle & User Domain Entities", () => {
  const validChronicleId = "111111111111111111";
  const validGuildId = "222222222222222222";
  const validUserId = "333333333333333333";
  const validDiscordId = "444444444444444444";
  const validRoleId = "555555555555555555";
  const now = new Date();

  describe("Chronicle Entity", () => {
    const createMockChronicleData = (
      overrides?: Partial<ChronicleData>
    ): ChronicleData => ({
      id: validChronicleId,
      name: "Chicago by Night",
      iconUrl: "https://cdn.discordapp.com/icons/123/abc.png",
      createdAt: now,
      lastUpdated: now,
      ...overrides,
    });

    it("should expose getters and mutate name/iconUrl independently from DiscordGuild", () => {
      const chronicle = new Chronicle(createMockChronicleData());

      expect(chronicle.id).toBe(validChronicleId);
      expect(chronicle.name).toBe("Chicago by Night");
      expect(chronicle.iconUrl).toBe(
        "https://cdn.discordapp.com/icons/123/abc.png"
      );
      expect(chronicle.createdAt).toBe(now);
      expect(chronicle.lastUpdated).toBe(now);

      chronicle.updateName("LA by Night");
      expect(chronicle.name).toBe("LA by Night");

      chronicle.updateIconUrl("");
      expect(chronicle.iconUrl).toBe("");

      const data = chronicle.toData();
      expect(ChronicleDataSchema.safeParse(data).success).toBe(true);

      const repoInput = chronicle.toRepositoryInput();
      expect(repoInput).toEqual({
        id: validChronicleId,
        name: "LA by Night",
        iconUrl: "",
      });
    });

    it("should throw RealmError when updating with invalid name or iconUrl", () => {
      const chronicle = new Chronicle(createMockChronicleData());

      expect(() => chronicle.updateName("")).toThrow(RealmError);
      expect(() => chronicle.updateName("a".repeat(101))).toThrow(RealmError);
      expect(() => chronicle.updateIconUrl("not-a-valid-url")).toThrow(
        RealmError
      );
    });
  });

  describe("DiscordGuild Entity", () => {
    const createMockGuildData = (
      overrides?: Partial<DiscordGuildData>
    ): DiscordGuildData => ({
      discordId: validGuildId,
      name: "Realm Server",
      iconUrl: "https://cdn.discordapp.com/icons/222/def.png",
      storytellerRoleIds: [],
      createdAt: now,
      lastUpdated: now,
      ...overrides,
    });

    it("should manage guild profile and storyteller roles independently", () => {
      const guild = new DiscordGuild(createMockGuildData());

      expect(guild.discordId).toBe(validGuildId);
      expect(guild.name).toBe("Realm Server");
      expect(guild.iconUrl).toBe(
        "https://cdn.discordapp.com/icons/222/def.png"
      );
      expect(guild.storytellerRoleIds).toEqual([]);
      expect(guild.createdAt).toBe(now);
      expect(guild.updatedAt).toBe(now);

      guild.updateName("Updated Server");
      guild.updateIconUrl("");
      guild.addStorytellerRole(validRoleId);
      // Duplicate addition should be idempotent
      guild.addStorytellerRole(validRoleId);

      expect(guild.name).toBe("Updated Server");
      expect(guild.iconUrl).toBe("");
      expect(guild.storytellerRoleIds).toEqual([validRoleId]);

      const data = guild.toData();
      expect(DiscordGuildDataSchema.safeParse(data).success).toBe(true);

      const repoInput = guild.toRepositoryInput();
      expect(repoInput).toEqual({
        discordId: validGuildId,
        name: "Updated Server",
        iconUrl: "",
        storytellerRoleIds: [validRoleId],
      });

      guild.removeStorytellerRole(validRoleId);
      expect(guild.storytellerRoleIds).toEqual([]);
    });

    it("should throw RealmError on invalid guild mutations", () => {
      const guild = new DiscordGuild(createMockGuildData());

      expect(() => guild.updateName("")).toThrow(RealmError);
      expect(() => guild.updateIconUrl("invalid-url")).toThrow(RealmError);
      expect(() => guild.addStorytellerRole("invalid-snowflake")).toThrow(
        RealmError
      );
      expect(() => guild.removeStorytellerRole("invalid-snowflake")).toThrow(
        RealmError
      );
    });
  });

  describe("ChronicleMember Entity", () => {
    const createMockMemberData = (
      overrides?: Partial<ChronicleMemberData>
    ): ChronicleMemberData => ({
      chronicleId: validChronicleId,
      userId: validUserId,
      isStoryteller: false,
      boosted: 0,
      nickname: "Kindred Player",
      avatarUrl: "https://cdn.discordapp.com/avatars/333/xyz.png",
      createdAt: now,
      lastUpdated: now,
      ...overrides,
    });

    it("should manage member profile and boost counts", () => {
      const member = new ChronicleMember(createMockMemberData());

      expect(member.chronicleId).toBe(validChronicleId);
      expect(member.userId).toBe(validUserId);
      expect(member.isStoryteller).toBe(false);
      expect(member.boosted).toBe(0);
      expect(member.isBoosting()).toBe(false);
      expect(member.nickname).toBe("Kindred Player");
      expect(member.createdAt).toBe(now);
      expect(member.lastUpdated).toBe(now);

      member.setNickname("Prince of the City");
      member.setAvatarUrl("");
      member.addBoost();

      expect(member.nickname).toBe("Prince of the City");
      expect(member.avatarUrl).toBe("");
      expect(member.boosted).toBe(1);
      expect(member.isBoosting()).toBe(true);

      const data = member.toData();
      expect(ChronicleMemberDataSchema.safeParse(data).success).toBe(true);

      expect(member.toRepositoryInput()).toEqual({
        chronicleId: validChronicleId,
        userId: validUserId,
        nickname: "Prince of the City",
        boosted: 1,
        avatarUrl: "",
      });

      member.removeBoost();
      expect(member.boosted).toBe(0);
      expect(member.isBoosting()).toBe(false);
    });

    it("should throw RealmError on invalid member updates or removing boost at zero", () => {
      const member = new ChronicleMember(createMockMemberData({ boosted: 0 }));

      expect(() => member.removeBoost()).toThrow(RealmError);
      expect(() => member.setNickname("a".repeat(50))).toThrow(RealmError);
      expect(() => member.setAvatarUrl("bad-url")).toThrow(RealmError);
    });
  });

  describe("User Entity", () => {
    const createMockUserData = (overrides?: Partial<UserData>): UserData => ({
      id: validUserId,
      discordId: validDiscordId,
      displayName: "Miki",
      avatarUrl: "https://cdn.discordapp.com/avatars/444/avatar.png",
      admin: false,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });

    it("should manage user profile and serialize to data/repository input", () => {
      const user = new User(createMockUserData());

      expect(user.id).toBe(validUserId);
      expect(user.discordId).toBe(validDiscordId);
      expect(user.displayName).toBe("Miki");
      expect(user.avatarUrl).toBe(
        "https://cdn.discordapp.com/avatars/444/avatar.png"
      );
      expect(user.createdAt).toBe(now);

      user.updateDisplayName("Miki Updated");
      user.updateAvatarUrl("https://cdn.discordapp.com/avatars/444/new.png");

      expect(user.displayName).toBe("Miki Updated");
      expect(user.avatarUrl).toBe(
        "https://cdn.discordapp.com/avatars/444/new.png"
      );

      const data = user.toData();
      expect(UserDataSchema.safeParse(data).success).toBe(true);

      expect(user.toRepositoryInput()).toEqual({
        id: validUserId,
        discordId: validDiscordId,
        displayName: "Miki Updated",
        avatarUrl: "https://cdn.discordapp.com/avatars/444/new.png",
        admin: false,
      });
    });

    it("should throw RealmError on invalid display name or avatar URL", () => {
      const user = new User(createMockUserData());

      expect(() => user.updateDisplayName("")).toThrow(RealmError);
      expect(() => user.updateAvatarUrl("not-a-url")).toThrow(RealmError);
    });
  });
});
