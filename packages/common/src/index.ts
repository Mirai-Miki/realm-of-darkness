/**
 * @realm/common - Shared Kernel Package
 *
 * This package contains all shared definitions, contracts, and interfaces
 * used across the Realm of Darkness monorepo.
 *
 * **Architecture**: Tier 0 (The Truth)
 * - Zero dependencies except zod
 * - Defines the "language" of the application
 * - All other packages depend on this
 *
 * **Contents**:
 * - **Interfaces**: ILogger, IEventClient, Repository interfaces
 * - **Types**: Snowflake, HttpStatus, DTOs
 * - **Enums**: Splats, SheetStatus, SupporterLevel, Environment
 * - **Errors**: RealmError, UserError
 * - **Contracts**: Zod schemas for events and data validation
 *
 * @packageDocumentation
 */

// Errors
export { RealmError, UserError } from "./error.definitions.js";

// Exports
export * from "./primitives";
export * from "./character";
export * from "./dice";
export * from "./logger";
export * from "./event-system.definitions";
export * from "./repository.definitions";
export * from "./supporter.definitions.js";
export * from "./user.definitions.js";
export * from "./chronicle.definitions.js";
export * from "./discord-guild.definitions.js";
export * from "./discord-guild-chronicle.definitions.js";
export * from "./chronicle-member.definitions.js";
export * from "./storyteller.definitions";
export * from "./system.definitions";
export * from "./interaction-session.definitions";
export * from "./command-manifest.definitions";
export * from "./utils";
