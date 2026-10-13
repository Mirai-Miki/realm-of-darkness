/**
 * Character entities and value objects.
 * Export all character-related domain models.
 */

// Base entities
export { Character } from "./character.entity";
export { Character5th } from "./character-5th.entity";
export { Character20th } from "./character-20th.entity";

// 5th Edition entities
export { Vampire5th } from "./vampire-5th.entity";
export { Werewolf5th } from "./werewolf-5th.entity";
export { Hunter5th } from "./hunter-5th.entity";
export { Human5th } from "./human-5th.entity";
export { Ghoul5th } from "./ghoul-5th.entity";

// 20th Anniversary entities
export { Vampire20th } from "./vampire-20th.entity";
export { Werewolf20th } from "./werewolf-20th.entity";
export { Mage20th } from "./mage-20th.entity";
export { Changeling20th } from "./changeling-20th.entity";
export { Demon20th } from "./demon-20th.entity";
export { Wraith20th } from "./wraith-20th.entity";
export { Human20th } from "./human-20th.entity";
export { Ghoul20th } from "./ghoul-20th.entity";

// Factory
export { CharacterFactory } from "./character.factory";
export type { CharacterEntity } from "./character.factory";

// Value objects
export * from "./value-objects";
