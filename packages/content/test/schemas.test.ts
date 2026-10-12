import { RealmError } from "@realm/common";
import {
  extractMdxFrontmatter,
  getDiscordCommandManifest,
  loadAllDiscordCommandManifests,
  parseCommandMdx,
} from "../src";

describe("Discord Command MDX SSOT Loader (@realm/content)", () => {
  it("should load and validate the /character command manifest from collections/documentation/discord/commands/character.mdx", () => {
    const manifest = getDiscordCommandManifest("character");

    expect(manifest.name).toBe("character");
    expect(manifest.dmPermission).toBe(false);
    expect(manifest.options).toHaveLength(1);
    expect(manifest.options[0]?.name).toBe("name");
    expect(manifest.options[0]?.required).toBe(true);
    expect(manifest.options[0]?.autocomplete).toBe(true);
  });

  it("should load and validate all Discord command MDX files without errors", () => {
    const manifests = loadAllDiscordCommandManifests();
    expect(manifests.length).toBeGreaterThanOrEqual(1);
    expect(manifests.some((m) => m.name === "character")).toBe(true);
  });

  it("should throw a RealmError if MDX frontmatter is missing", () => {
    expect(() => extractMdxFrontmatter("# Just a heading")).toThrow(RealmError);
  });

  it("should throw a RealmError if MDX command metadata fails Zod schema validation", () => {
    const badMdx = `---
title: "/bad"
description: "Bad command"
command:
  name: "INVALID NAME WITH SPACES"
  description: "Invalid"
---
# Bad`;

    expect(() => parseCommandMdx(badMdx, "bad.mdx")).toThrow(RealmError);
  });

  it("should throw a RealmError when requesting a non-existent command MDX", () => {
    expect(() => getDiscordCommandManifest("non_existent_command_xyz")).toThrow(
      RealmError
    );
  });
});
