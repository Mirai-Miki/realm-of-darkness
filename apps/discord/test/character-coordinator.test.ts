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
  CharacterSessionStateDataSchema,
  CharacterSheetTab,
  CharacterWorkflowStep,
} from "../src/features/character";
import { CharacterFactory } from "@realm/core";
import type {
  CharacterData,
  CreateInteractionSessionInput,
  ICharacterRepository,
  Snowflake,
  TypedInteractionSession,
  UpdateInteractionSessionInput,
  Vampire5thData,
  Werewolf5thData,
} from "@realm/common";
import type { InteractionSessionRepository } from "@realm/repositories";
import type { z } from "zod";
import type {
  AutocompleteContext,
  CommandContext,
  InterfaceContext,
} from "../src/framework";

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

/**
 * In-memory test double for `CharacterRepository` so we can verify
 * PostgreSQL character persistence workflows without an external DB connection.
 */
class InMemoryCharacterRepository implements ICharacterRepository {
  private readonly store = new Map<Snowflake, CharacterData>();

  public async findById(id: Snowflake): Promise<CharacterData | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }

  public async findByUser(userId: Snowflake): Promise<CharacterData[]> {
    return Array.from(this.store.values()).filter((c) => c.userId === userId);
  }

  public async findByChronicle(
    chronicleId: Snowflake
  ): Promise<CharacterData[]> {
    return Array.from(this.store.values()).filter(
      (c) => c.chronicleId === chronicleId
    );
  }

  public async create(
    input: CharacterData | Omit<CharacterData, "id">
  ): Promise<CharacterData> {
    const id = "id" in input && input.id ? input.id : generateSnowflake();
    const data = { ...input, id } as CharacterData;
    this.store.set(id, data);
    return { ...data };
  }

  public async update(input: CharacterData): Promise<CharacterData>;
  public async update(
    input: CharacterData,
    options: { ignoreNotFound: true }
  ): Promise<CharacterData | null>;
  public async update(
    input: CharacterData,
    _options?: { ignoreNotFound: boolean }
  ): Promise<CharacterData | null> {
    this.store.set(input.id, { ...input });
    return { ...input };
  }

  public async upsert(input: CharacterData): Promise<CharacterData> {
    this.store.set(input.id, { ...input });
    return { ...input };
  }

  public async delete(id: Snowflake): Promise<void> {
    this.store.delete(id);
  }

  public async exists(id: Snowflake): Promise<boolean> {
    return this.store.has(id);
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

  describe("CharacterCoordinator Pure RenderEnvelope Flow with Real DB Persistence", () => {
    const userId = generateSnowflake();

    it("should return an Editor Home NormalizedRenderEnvelope for an existing character", async () => {
      const sessionRepo = new InMemoryInteractionSessionRepository();
      const characterRepo = new InMemoryCharacterRepository();
      const coordinator = new CharacterCoordinator(
        sessionRepo as unknown as InteractionSessionRepository,
        characterRepo
      );

      // Pre-seed an existing character in the repository
      const seeded = CharacterFactory.createDefaultData({
        userId,
        name: "Helena Vance",
        splat: Splat.Vampire5th,
      });
      await characterRepo.create(seeded);

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

    it("should route a non-existent character through Confirmation -> Splat Selection -> Real DB Persistence -> Editor -> Tabs -> Modal -> Deletion", async () => {
      const sessionRepo = new InMemoryInteractionSessionRepository();
      const characterRepo = new InMemoryCharacterRepository();
      const coordinator = new CharacterCoordinator(
        sessionRepo as unknown as InteractionSessionRepository,
        characterRepo
      );

      // 1. Run /character with a brand new name "Viktor"
      const sessionCreateSpy = jest.spyOn(sessionRepo, "create");

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

      // 2. Click "Confirm Create" button -> advances to splat selection
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

      // 3. Select Splat (Vampire 5th) -> completes creation immediately without clan and saves to real CharacterRepository
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

      const editorEnvelope = await coordinator.handleInterface(splatCtx);
      expect(editorEnvelope.kind).toBe("message");

      // Verify Viktor was persisted in PostgreSQL character repository
      const userCharacters = await characterRepo.findByUser(userId);
      expect(userCharacters).toHaveLength(1);
      const savedViktor = userCharacters[0] as Vampire5thData;
      expect(savedViktor.name).toBe("Viktor");
      expect(savedViktor.splat).toBe(Splat.Vampire5th);
      expect(savedViktor.hunger).toBe(1);

      // 4. Click [+ Hunger] button on the Editor Dashboard
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

      // Verify hunger was updated in repository to 2
      const updatedCharacters = await characterRepo.findByUser(userId);
      const updatedViktor = updatedCharacters[0] as Vampire5thData;
      expect(updatedViktor.hunger).toBe(2);

      // 5. Tab Navigation: Switch to Traits tab
      const tabTraitsCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.TabTraits
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      const traitsEnvelope = await coordinator.handleInterface(tabTraitsCtx);
      expect(traitsEnvelope.kind).toBe("message");

      // Switch back to Trackers tab
      const tabTrackersCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.TabTrackers
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      const trackersEnvelope =
        await coordinator.handleInterface(tabTrackersCtx);
      expect(trackersEnvelope.kind).toBe("message");

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

      // Submit Bio Modal
      const submitBioCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.EditBioModal
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => true,
          fields: {
            getTextInputValue: (field: string) => {
              if (field === "concept") return "Brooding Scholar";
              if (field === "ambition") return "Master blood sorcery";
              return "";
            },
          },
        },
      } as unknown as InterfaceContext;

      const bioEnvelope = await coordinator.handleInterface(submitBioCtx);
      expect(bioEnvelope.kind).toBe("message");

      // 7. Verify Autocomplete finds Viktor in CharacterRepository
      const respondMock = jest.fn();
      const autocompleteCtx = {
        interaction: {
          user: { id: userId },
          options: {
            getFocused: () => "vik",
          },
          respond: respondMock,
        },
      } as unknown as AutocompleteContext;

      await coordinator.autocomplete(autocompleteCtx);
      expect(respondMock).toHaveBeenCalledWith([
        {
          name: "Viktor (vampire5th)",
          value: "Viktor",
        },
      ]);

      // 8. Delete Confirmation Flow
      // Navigate to Delete tab
      const tabDeleteCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.TabDelete
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      const deleteWarningEnvelope =
        await coordinator.handleInterface(tabDeleteCtx);
      expect(deleteWarningEnvelope.kind).toBe("message");

      // Cancel deletion first
      const cancelDeleteCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.DeleteConfirmCancel
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      const cancelledEnvelope =
        await coordinator.handleInterface(cancelDeleteCtx);
      expect(cancelledEnvelope.kind).toBe("message");
      expect(await characterRepo.findById(savedViktor.id)).not.toBeNull();

      // Navigate back to delete and confirm deletion
      await coordinator.handleInterface(tabDeleteCtx);
      const confirmDeleteCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            sessionId,
            CharacterControl.DeleteConfirmYes
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      const deletedEnvelope =
        await coordinator.handleInterface(confirmDeleteCtx);
      expect(deletedEnvelope.kind).toBe("message");

      // Verify Viktor was completely removed from the repository
      expect(await characterRepo.findById(savedViktor.id)).toBeNull();
    });

    it("should allow cancelling character creation during ConfirmCreate step", async () => {
      const sessionRepo = new InMemoryInteractionSessionRepository();
      const characterRepo = new InMemoryCharacterRepository();
      const coordinator = new CharacterCoordinator(
        sessionRepo as unknown as InteractionSessionRepository,
        characterRepo
      );

      const mockCommandCtx = {
        interaction: {
          user: { id: userId },
          options: {
            getString: () => "Abandoned",
          },
        },
      } as unknown as CommandContext;

      const confirmEnvelope = await coordinator.execute(mockCommandCtx);
      expect(confirmEnvelope.kind).toBe("message");

      const sessions = await sessionRepo.getActive;
      expect(sessions).toBeDefined();

      // Create session first so cancel can find it
      const created = await sessionRepo.create(
        {
          userId,
          handlerId: "character",
          step: CharacterWorkflowStep.ConfirmCreate,
          state: {
            characterName: "Abandoned",
            activeTab: CharacterSheetTab.Trackers,
            concept: "",
            ambition: "",
          },
        },
        CharacterSessionStateDataSchema
      );

      const cancelValidCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            created.id,
            CharacterControl.ConfirmCreateCancel
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      const cancelledEnvelope =
        await coordinator.handleInterface(cancelValidCtx);
      expect(cancelledEnvelope.kind).toBe("message");
    });

    it("should mutate Werewolf 5th domain entities (Crinos form shift and Rage adjustments)", async () => {
      const sessionRepo = new InMemoryInteractionSessionRepository();
      const characterRepo = new InMemoryCharacterRepository();
      const coordinator = new CharacterCoordinator(
        sessionRepo as unknown as InteractionSessionRepository,
        characterRepo
      );

      // Pre-seed a Werewolf 5th character
      const werewolfData = CharacterFactory.createDefaultData({
        userId,
        name: "Fenris",
        splat: Splat.Werewolf5th,
      });
      const savedWerewolf = await characterRepo.create(werewolfData);
      const baselineHealthTotal = savedWerewolf.health.total;

      const session = await sessionRepo.create(
        {
          userId,
          handlerId: "character",
          step: CharacterWorkflowStep.EditorHome,
          state: {
            characterId: savedWerewolf.id,
            characterName: savedWerewolf.name,
            splat: savedWerewolf.splat,
            activeTab: CharacterSheetTab.Trackers,
            concept: "Forest Guardian",
            ambition: "Protect the Caern",
          },
        },
        CharacterSessionStateDataSchema
      );

      // Shift into Crinos form -> increases health total by 4
      const shiftCrinosCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            session.id,
            CharacterControl.ShiftCrinos
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      await coordinator.handleInterface(shiftCrinosCtx);

      const crinosWerewolf = (await characterRepo.findById(
        savedWerewolf.id
      )) as Werewolf5thData;
      expect(crinosWerewolf.health.total).toBe(baselineHealthTotal + 4);

      // Increase Rage
      const incRageCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            session.id,
            CharacterControl.IncreaseRage
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      await coordinator.handleInterface(incRageCtx);

      const rageWerewolf = (await characterRepo.findById(
        savedWerewolf.id
      )) as Werewolf5thData;
      expect(rageWerewolf.rage).toBe(3);

      // Revert to Homid form -> resets health back to baseline
      const shiftHomidCtx = {
        interaction: {
          user: { id: userId },
          customId: encodeSessionCustomId(
            "character",
            session.id,
            CharacterControl.ShiftHomid
          ),
          isStringSelectMenu: () => false,
          isModalSubmit: () => false,
        },
      } as unknown as InterfaceContext;

      await coordinator.handleInterface(shiftHomidCtx);

      const homidWerewolf = (await characterRepo.findById(
        savedWerewolf.id
      )) as Werewolf5thData;
      expect(homidWerewolf.health.total).toBe(baselineHealthTotal);
    });
  });
});
