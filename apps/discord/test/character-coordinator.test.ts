import { generateSnowflake, Splat, UserError, RealmError } from "@realm/common";
import {
  buildSlashCommandFromMdx,
  decodeSessionCustomId,
  encodeSessionCustomId,
} from "../src/framework";
import {
  CharacterControl,
  CharacterCoordinator,
  CharacterQuickAction,
  CharacterWorkflowStep,
  MockCharacterService,
} from "../src/features/character";
import type {
  CreateInteractionSessionInput,
  Snowflake,
  TypedInteractionSession,
  UpdateInteractionSessionInput,
} from "@realm/common";
import type { InteractionSessionRepository } from "@realm/repositories";
import type { z } from "zod";
import type { CommandContext, InterfaceContext } from "../src/framework";

/**
 * In-memory test double for `InteractionSessionRepository` so we can verify
 * stateless PostgreSQL session workflows without an external DB connection.
 */
class InMemoryInteractionSessionRepository {
  private readonly sessions = new Map<
    Snowflake,
    {
      id: Snowflake;
      userId: Snowflake;
      handlerId: string;
      step: string;
      state: Record<string, unknown>;
      expiresAt: Date;
      createdAt: Date;
      updatedAt: Date;
    }
  >();

  public async create<TState>(
    input: CreateInteractionSessionInput<TState>,
    stateSchema: z.ZodType<TState>
  ): Promise<TypedInteractionSession<TState>> {
    const validatedState = stateSchema.parse(input.state);
    const id = generateSnowflake();
    const now = new Date();
    const row = {
      id,
      userId: input.userId,
      handlerId: input.handlerId,
      step: input.step,
      state: validatedState as Record<string, unknown>,
      expiresAt: new Date(now.getTime() + 3600000),
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(id, row);
    return {
      ...row,
      state: validatedState,
    };
  }

  public async getActive<TState>(
    id: Snowflake,
    stateSchema: z.ZodType<TState>,
    expectedUserId?: Snowflake
  ): Promise<TypedInteractionSession<TState>> {
    const row = this.sessions.get(id);
    if (!row) {
      throw new UserError("Session expired or not found");
    }
    if (expectedUserId && row.userId !== expectedUserId) {
      throw new UserError("Not your session");
    }
    const parsedState = stateSchema.parse(row.state);
    return {
      ...row,
      state: parsedState,
    };
  }

  public async update<TState>(
    id: Snowflake,
    updates: UpdateInteractionSessionInput<TState>,
    stateSchema: z.ZodType<TState>
  ): Promise<TypedInteractionSession<TState>> {
    const row = this.sessions.get(id);
    if (!row) {
      throw new UserError("Session not found");
    }
    if (updates.step !== undefined) {
      row.step = updates.step;
    }
    if (updates.state !== undefined) {
      row.state = stateSchema.parse(updates.state) as Record<string, unknown>;
    }
    row.updatedAt = new Date();
    return {
      ...row,
      state: stateSchema.parse(row.state),
    };
  }

  public async delete(id: Snowflake): Promise<void> {
    this.sessions.delete(id);
  }
}

describe("Discord Stateless Session & CharacterCoordinator (@realm/discord)", () => {
  describe("Session customId Encoding & Decoding", () => {
    it("should encode and decode handlerId, sessionId, and control accurately", () => {
      const sessionId = generateSnowflake();
      const customId = encodeSessionCustomId(
        "character",
        sessionId,
        CharacterControl.IncreaseHunger
      );

      const decoded = decodeSessionCustomId(customId);
      expect(decoded.handlerId).toBe("character");
      expect(decoded.sessionId).toBe(sessionId);
      expect(decoded.control).toBe(CharacterControl.IncreaseHunger);
    });

    it("should throw a RealmError if customId has an invalid Snowflake", () => {
      expect(() =>
        decodeSessionCustomId("character:not_a_snowflake:inc")
      ).toThrow(RealmError);
    });
  });

  describe("MDX Command Builder SSOT", () => {
    it("should build the /character SlashCommandBuilder directly from character.mdx", () => {
      const builder = buildSlashCommandFromMdx("character");
      const json = builder.toJSON();

      expect(json.name).toBe("character");
      expect(json.options).toHaveLength(1);
      expect(json.options?.[0]?.name).toBe("name");
    });
  });

  describe("CharacterCoordinator Pure RenderEnvelope Flow", () => {
    const userId = generateSnowflake();

    it("should return an Editor Home NormalizedRenderEnvelope for an existing character", async () => {
      const repo = new InMemoryInteractionSessionRepository();
      const service = new MockCharacterService();
      const coordinator = new CharacterCoordinator(
        repo as unknown as InteractionSessionRepository,
        service
      );

      const mockCommandCtx = {
        interaction: {
          user: { id: userId },
          options: {
            getString: () => "Helena Vance",
          },
        },
      } as unknown as CommandContext;

      const envelope = await coordinator.execute(mockCommandCtx);
      expect(envelope.kind).toBe("message");
      if (envelope.kind === "message") {
        expect(envelope.primary.ephemeral).toBe(true);
        expect(envelope.primary.components.length).toBeGreaterThanOrEqual(4);
      }
    });

    it("should route a non-existent character through Confirmation -> Wizard -> Editor Home -> Modal", async () => {
      const repo = new InMemoryInteractionSessionRepository();
      const service = new MockCharacterService();
      const coordinator = new CharacterCoordinator(
        repo as unknown as InteractionSessionRepository,
        service
      );

      // 1. Run /character with a brand new name "Viktor"
      const sessionCreateSpy = jest.spyOn(repo, "create");

      const mockCommandCtx = {
        interaction: {
          user: { id: userId },
          options: {
            getString: () => "Viktor",
          },
        },
      } as unknown as CommandContext;

      const confirmEnvelope = await coordinator.execute(mockCommandCtx);
      expect(confirmEnvelope.kind).toBe("message");
      expect(sessionCreateSpy).toHaveBeenCalledTimes(1);

      const createdSession = await sessionCreateSpy.mock.results[0]?.value;
      expect(createdSession.step).toBe(CharacterWorkflowStep.ConfirmCreate);

      const sessionId: Snowflake = createdSession.id;

      // 2. Click "Confirm Create" button
      const confirmCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.ConfirmCreateYes
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      const splatEnvelope = await coordinator.handleInterface(confirmCtx);
      expect(splatEnvelope.kind).toBe("message");

      // 3. Select Splat (Vampire 5th)
      const splatCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.SelectSplatMenu
          ),
          isStringSelectMenu: () => true,
          isModalSubmit: () => false,
          values: [Splat.Vampire5th],
        },
      } as unknown as InterfaceContext;

      const clanEnvelope = await coordinator.handleInterface(splatCtx);
      expect(clanEnvelope.kind).toBe("message");

      // 4. Select Clan (Tremere) -> completes creation and saves to MockCharacterService
      const clanCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.SelectClanMenu
          ),
          isStringSelectMenu: () => true,
          isModalSubmit: () => false,
          values: ["Tremere"],
        },
      } as unknown as InterfaceContext;

      const editorEnvelope = await coordinator.handleInterface(clanCtx);
      expect(editorEnvelope.kind).toBe("message");

      const savedViktor = service.findByName(userId, "Viktor");
      expect(savedViktor).not.toBeNull();
      expect(savedViktor?.clan).toBe("Tremere");
      expect(savedViktor?.hunger).toBe(1);

      // 5. Click [+ Hunger] button on the Editor Dashboard
      const incHungerCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.IncreaseHunger
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      await coordinator.handleInterface(incHungerCtx);

      const updatedViktor = service.findByName(userId, "Viktor");
      expect(updatedViktor?.hunger).toBe(2);

      // 6. Select "Open Bio Modal" from the quick action dropdown -> returns a Modal envelope!
      const openModalCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.QuickActionMenu
          ),
          isStringSelectMenu: () => true,
          isModalSubmit: () => false,
          values: [CharacterQuickAction.OpenBioModal],
        },
      } as unknown as InterfaceContext;

      const modalEnvelope = await coordinator.handleInterface(openModalCtx);
      expect(modalEnvelope.kind).toBe("modal");
    });
  });
});
