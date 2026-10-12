import {
  CommandDocFrontmatterDataSchema,
  CommandOptionType,
  InteractionSessionDataSchema,
  generateSnowflake,
} from "../src";

describe("CommandManifest & InteractionSession Schemas (@realm/common)", () => {
  describe("CommandDocFrontmatterDataSchema", () => {
    it("should validate a complete Discord command MDX frontmatter object", () => {
      const valid = {
        title: "/character",
        description: "Manage characters",
        command: {
          name: "character",
          description: "Create or manage a character sheet",
          dmPermission: false,
          options: [
            {
              name: "name",
              type: CommandOptionType.String,
              description: "Character name",
              required: true,
              autocomplete: true,
              minLength: 2,
              maxLength: 50,
            },
          ],
        },
      };

      const parsed = CommandDocFrontmatterDataSchema.parse(valid);
      expect(parsed.command.name).toBe("character");
      expect(parsed.command.options).toHaveLength(1);
      expect(parsed.command.options[0]?.autocomplete).toBe(true);
    });

    it("should reject invalid uppercase command names", () => {
      const invalid = {
        title: "/Character",
        description: "Invalid uppercase name",
        command: {
          name: "CharacterCommand",
          description: "Invalid",
        },
      };

      const result = CommandDocFrontmatterDataSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("InteractionSessionDataSchema", () => {
    it("should validate a valid interaction session record", () => {
      const now = new Date();
      const valid = {
        id: generateSnowflake(),
        userId: generateSnowflake(),
        handlerId: "character",
        step: "editor_home",
        state: { characterName: "Helena Vance", hunger: 2 },
        expiresAt: new Date(now.getTime() + 60000),
        createdAt: now,
        updatedAt: now,
      };

      const parsed = InteractionSessionDataSchema.parse(valid);
      expect(parsed.handlerId).toBe("character");
      expect(parsed.state.characterName).toBe("Helena Vance");
    });
  });
});
