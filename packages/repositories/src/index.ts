/**
 * Repositories package for the Realm of Darkness application.
 *
 * Provides data access layer implementations that bridge between
 * domain models and database persistence.
 *
 * @example
 * ```typescript
 * import { UserRepository } from "@realm/repositories";
 * import { db } from "@realm/database";
 *
 * const userRepo = new UserRepository(db);
 * const user = await userRepo.findById("123456789012345678");
 * ```
 */

// Export repositories
export { UserRepository } from "./user.repository";
export { DiscordGuildRepository } from "./discord-guild.repository";
export { DiscordGuildChronicleRepository } from "./discord-guild-chronicle.repository";
export { ChronicleMemberRepository } from "./chronicle-member.repository";
export { SystemRepository } from "./system.repository";

export { CharacterRepository } from "./character.repository";
export { ChronicleRepository } from "./chronicle.repository";
export {
  InteractionSessionRepository,
  parseSessionRow,
  DEFAULT_SESSION_TTL_MS,
} from "./interaction-session.repository";
