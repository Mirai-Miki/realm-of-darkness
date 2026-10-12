import { z } from "zod";
import { SnowflakeSchema } from "./primitives";

/**
 * Schema for a persisted Discord interaction session record.
 *
 * Used by stateless interaction workflows (wizards, interactive sheet editors)
 * to store state in PostgreSQL rather than in-memory collectors.
 */
export const InteractionSessionDataSchema = z.object({
  id: SnowflakeSchema,
  userId: SnowflakeSchema,
  handlerId: z.string().min(1).max(64),
  step: z.string().min(1).max(64),
  state: z.record(z.string(), z.unknown()),
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Inferred TypeScript type for a persisted interaction session record.
 */
export type InteractionSessionData = z.infer<
  typeof InteractionSessionDataSchema
>;

/**
 * Typed wrapper around an interaction session whose `state` has been parsed
 * against a specific feature Zod schema.
 */
export interface TypedInteractionSession<TState> extends Omit<
  InteractionSessionData,
  "state"
> {
  /** Validated feature-specific session state */
  state: TState;
}

/**
 * Input contract for creating a new interaction session.
 */
export interface CreateInteractionSessionInput<TState> {
  /** Owner user ID (RoD Snowflake) */
  userId: z.infer<typeof SnowflakeSchema>;
  /** Target coordinator/handler ID */
  handlerId: string;
  /** Initial step identifier */
  step: string;
  /** Feature-specific state payload */
  state: TState;
  /** Optional custom TTL in milliseconds (defaults to 24 hours) */
  ttlMs?: number;
}

/**
 * Input contract for updating an existing interaction session.
 */
export interface UpdateInteractionSessionInput<TState> {
  /** Optional updated workflow step */
  step?: string;
  /** Optional updated feature state */
  state?: TState;
  /** Optional refreshed TTL in milliseconds */
  ttlMs?: number;
}
