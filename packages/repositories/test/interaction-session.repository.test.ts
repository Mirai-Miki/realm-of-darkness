import { z } from "zod";
import { generateSnowflake, RealmError } from "@realm/common";
import { parseSessionRow } from "../src";

const SampleStateSchema = z.object({
  characterName: z.string(),
  hunger: z.number().int().min(0).max(5),
});

describe("InteractionSessionRepository & parseSessionRow (@realm/repositories)", () => {
  it("should parse a valid database interaction_sessions row into a TypedInteractionSession", () => {
    const now = new Date();
    const row = {
      id: generateSnowflake(),
      userId: generateSnowflake(),
      handlerId: "character",
      step: "editor_home",
      state: { characterName: "Helena Vance", hunger: 2 },
      expiresAt: new Date(now.getTime() + 3600000),
      createdAt: now,
      updatedAt: now,
    };

    const session = parseSessionRow(row, SampleStateSchema);
    expect(session.id).toBe(row.id);
    expect(session.state.characterName).toBe("Helena Vance");
    expect(session.state.hunger).toBe(2);
  });

  it("should throw a RealmError if the stored JSONB state fails Zod schema validation", () => {
    const now = new Date();
    const corruptedRow = {
      id: generateSnowflake(),
      userId: generateSnowflake(),
      handlerId: "character",
      step: "editor_home",
      state: { characterName: "Helena Vance", hunger: 99 },
      expiresAt: new Date(now.getTime() + 3600000),
      createdAt: now,
      updatedAt: now,
    };

    expect(() => parseSessionRow(corruptedRow, SampleStateSchema)).toThrow(
      RealmError
    );
  });
});
