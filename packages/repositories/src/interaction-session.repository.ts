import { eq, lte } from "drizzle-orm";
import { db, interactionSessions } from "@realm/database";
import { generateSnowflake, RealmError, UserError } from "@realm/common";
import type {
  CreateInteractionSessionInput,
  Snowflake,
  TypedInteractionSession,
  UpdateInteractionSessionInput,
} from "@realm/common";
import type { InteractionSessionDb } from "@realm/database";
import type { z } from "zod";

/**
 * Default Time-To-Live for an interaction session (60 days / ~2 months in milliseconds).
 * Gives users ample time to interact with public-facing buttons (such as dice rerolls)
 * while keeping the PostgreSQL table periodically swept.
 */
export const DEFAULT_SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * Converts a database `interaction_sessions` row into a validated, strongly-typed
 * `TypedInteractionSession<TState>`.
 *
 * @param row - The raw database row from PostgreSQL
 * @param stateSchema - The Zod schema used to validate the JSONB state payload
 * @returns The validated typed interaction session
 * @throws {RealmError} If the JSONB state fails Zod validation
 *
 * @example
 * ```typescript
 * const session = parseSessionRow(row, MyFeatureStateSchema);
 * ```
 */
export function parseSessionRow<TState>(
  row: InteractionSessionDb,
  stateSchema: z.ZodType<TState>
): TypedInteractionSession<TState> {
  const parsedState = stateSchema.safeParse(row.state);

  if (!parsedState.success) {
    throw new RealmError("Stored interaction session state failed validation", {
      fields: {
        sessionId: row.id,
        handlerId: row.handlerId,
        step: row.step,
        error: parsedState.error.message,
      },
    });
  }

  return {
    id: row.id,
    userId: row.userId,
    handlerId: row.handlerId,
    step: row.step,
    state: parsedState.data,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Repository for managing stateless Discord interaction sessions in PostgreSQL.
 *
 * Replaces in-memory Discord.js component collectors and avoids storing state in Redis RAM.
 * Every button, select menu, and modal stores its workflow state here, keyed by a Snowflake `sessionId`.
 */
export class InteractionSessionRepository {
  /**
   * Create a new interaction session in PostgreSQL.
   *
   * @param input - Session creation parameters including initial state
   * @param stateSchema - Zod schema to validate the initial state before saving
   * @returns The created and validated interaction session
   * @throws {RealmError} If state validation or database insertion fails
   *
   * @example
   * ```typescript
   * const session = await repo.create(
   *   { userId, handlerId: "character", step: "confirm_create", state: { name: "Viktor" } },
   *   CharacterWizardStateSchema
   * );
   * ```
   */
  public async create<TState>(
    input: CreateInteractionSessionInput<TState>,
    stateSchema: z.ZodType<TState>
  ): Promise<TypedInteractionSession<TState>> {
    // Validate state payload prior to persisting
    const validatedState = stateSchema.parse(input.state);
    const id = generateSnowflake();
    const now = new Date();
    const ttlMs = input.ttlMs ?? DEFAULT_SESSION_TTL_MS;
    const expiresAt = new Date(now.getTime() + ttlMs);

    const [inserted] = await db
      .insert(interactionSessions)
      .values({
        id,
        userId: input.userId,
        handlerId: input.handlerId,
        step: input.step,
        state: validatedState,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!inserted) {
      throw new RealmError("Failed to create interaction session in database", {
        fields: {
          id,
          userId: input.userId,
          handlerId: input.handlerId,
        },
      });
    }

    return parseSessionRow(inserted, stateSchema);
  }

  /**
   * Retrieve an active interaction session by ID and verify ownership and expiration.
   *
   * @param id - The Snowflake session ID extracted from the Discord `customId`
   * @param stateSchema - The Zod schema to validate the JSONB state payload
   * @param expectedUserId - Optional user ID to enforce that only the session owner can interact
   * @returns The validated active interaction session
   * @throws {UserError} If the session does not exist, has expired, or belongs to another user
   * @throws {RealmError} If the stored JSONB state is corrupted
   *
   * @example
   * ```typescript
   * const session = await repo.getActive(sessionId, CharacterWizardStateSchema, actor.id);
   * ```
   */
  public async getActive<TState>(
    id: Snowflake,
    stateSchema: z.ZodType<TState>,
    expectedUserId?: Snowflake
  ): Promise<TypedInteractionSession<TState>> {
    const [row] = await db
      .select()
      .from(interactionSessions)
      .where(eq(interactionSessions.id, id))
      .limit(1);

    if (!row) {
      throw new UserError(
        "This interaction session has expired or no longer exists. Please run the command again.",
        {
          fields: { sessionId: id },
        }
      );
    }

    // Check if the session has passed its expiration timestamp
    if (row.expiresAt.getTime() <= Date.now()) {
      await this.delete(id);
      throw new UserError(
        "This interaction session has expired. Please run the command again.",
        {
          fields: { sessionId: id },
        }
      );
    }

    // Enforce ownership so other guild members cannot click buttons on non-ephemeral views
    if (expectedUserId && row.userId !== expectedUserId) {
      throw new UserError(
        "You cannot interact with another user's session. Please run the command yourself.",
        {
          fields: {
            sessionId: id,
            ownerId: row.userId,
            actorId: expectedUserId,
          },
        }
      );
    }

    return parseSessionRow(row, stateSchema);
  }

  /**
   * Update the step and/or state of an existing interaction session and refresh its TTL.
   *
   * @param id - The Snowflake session ID to update
   * @param updates - New step and/or state values
   * @param stateSchema - Zod schema to validate the updated state
   * @returns The updated and validated interaction session
   * @throws {UserError} If the session no longer exists
   * @throws {RealmError} If validation fails
   *
   * @example
   * ```typescript
   * const updated = await repo.update(
   *   sessionId,
   *   { step: "editor_home", state: nextState },
   *   CharacterWizardStateSchema
   * );
   * ```
   */
  public async update<TState>(
    id: Snowflake,
    updates: UpdateInteractionSessionInput<TState>,
    stateSchema: z.ZodType<TState>
  ): Promise<TypedInteractionSession<TState>> {
    const now = new Date();
    const ttlMs = updates.ttlMs ?? DEFAULT_SESSION_TTL_MS;
    const expiresAt = new Date(now.getTime() + ttlMs);

    const setValues: Record<string, unknown> = {
      updatedAt: now,
      expiresAt,
    };

    if (updates.step !== undefined) {
      setValues.step = updates.step;
    }

    if (updates.state !== undefined) {
      const validatedState = stateSchema.parse(updates.state);
      setValues.state = validatedState;
    }

    const [updated] = await db
      .update(interactionSessions)
      .set(setValues)
      .where(eq(interactionSessions.id, id))
      .returning();

    if (!updated) {
      throw new UserError(
        "This interaction session has expired or was closed. Please run the command again.",
        {
          fields: { sessionId: id },
        }
      );
    }

    return parseSessionRow(updated, stateSchema);
  }

  /**
   * Delete an interaction session when a workflow is cancelled or completed.
   *
   * @param id - The Snowflake session ID to delete
   *
   * @example
   * ```typescript
   * await repo.delete(sessionId);
   * ```
   */
  public async delete(id: Snowflake): Promise<void> {
    await db.delete(interactionSessions).where(eq(interactionSessions.id, id));
  }

  /**
   * Delete all interaction sessions whose `expiresAt` timestamp is at or before `now`.
   *
   * Uses the `interaction_sessions_expires_at_idx` B-tree index in PostgreSQL
   * for fast periodic sweeping.
   *
   * @param now - Cutoff timestamp (defaults to `new Date()`)
   * @returns The number of expired session rows deleted
   *
   * @example
   * ```typescript
   * const deletedCount = await repo.deleteExpired();
   * ```
   */
  public async deleteExpired(now: Date = new Date()): Promise<number> {
    const deleted = await db
      .delete(interactionSessions)
      .where(lte(interactionSessions.expiresAt, now))
      .returning({ id: interactionSessions.id });

    return deleted.length;
  }
}
