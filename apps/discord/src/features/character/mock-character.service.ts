import { Splat } from "@realm/common";
import type { CharacterSessionStateData } from "./character-session.definitions";

/**
 * Service managing mock characters for testing the `/character` context-sensitive
 * command flow before full character sheet persistence is wired.
 *
 * Pre-populates a pair of sample characters so users can immediately test:
 * 1. Autocomplete and direct Editor Dashboard entry (for existing names)
 * 2. Typo-prevention Confirmation and Creation Wizard (for new names)
 */
export class MockCharacterService {
  /**
   * Keyed by `<userId>:<lowercaseName>` so each user has a deterministic mock roster.
   */
  private readonly store = new Map<string, CharacterSessionStateData>();

  /**
   * Ensures a user has default mock characters seeded on first lookup.
   */
  private ensureSeeded(userId: string): void {
    const prefix = `${userId}:`;
    const hasAny = Array.from(this.store.keys()).some((k) =>
      k.startsWith(prefix)
    );

    if (hasAny) {
      return;
    }

    const sampleCharacters: CharacterSessionStateData[] = [
      {
        characterName: "Helena Vance",
        splat: Splat.Vampire5th,
        clan: "Lasombra",
        concept: "Shadow Broker & Occult Antiquarian",
        ambition: "Reclaim the lost library of Vienna",
        generation: 11,
        hunger: 2,
        healthMax: 6,
        healthSuperficial: 1,
        willpowerMax: 6,
        willpowerSuperficial: 2,
      },
      {
        characterName: "Marcus Thorne",
        splat: Splat.Vampire20th,
        clan: "Ventrue",
        concept: "Corporate Fixer",
        ambition: "Secure Primogen seat before winter",
        generation: 10,
        hunger: 1,
        healthMax: 7,
        healthSuperficial: 0,
        willpowerMax: 7,
        willpowerSuperficial: 1,
      },
    ];

    for (const char of sampleCharacters) {
      this.store.set(`${userId}:${char.characterName.toLowerCase()}`, char);
    }
  }

  /**
   * Find all mock characters belonging to a user.
   *
   * @param userId - The user's Snowflake ID
   * @returns Array of character state records
   *
   * @example
   * ```typescript
   * const list = mockCharacterService.findByUser(userId);
   * ```
   */
  public findByUser(userId: string): CharacterSessionStateData[] {
    this.ensureSeeded(userId);
    const prefix = `${userId}:`;
    const results: CharacterSessionStateData[] = [];

    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        results.push({ ...value });
      }
    }

    return results;
  }

  /**
   * Find a specific character by name for a user (case-insensitive).
   *
   * @param userId - The user's Snowflake ID
   * @param name - The character name to look up
   * @returns The character state if found, or `null` if it does not exist
   *
   * @example
   * ```typescript
   * const existing = mockCharacterService.findByName(userId, "Helena Vance");
   * ```
   */
  public findByName(
    userId: string,
    name: string
  ): CharacterSessionStateData | null {
    this.ensureSeeded(userId);
    const found = this.store.get(`${userId}:${name.trim().toLowerCase()}`);
    return found ? { ...found } : null;
  }

  /**
   * Save or update a mock character for a user.
   *
   * @param userId - The user's Snowflake ID
   * @param state - The character state to persist
   * @returns The saved character state
   *
   * @example
   * ```typescript
   * mockCharacterService.save(userId, updatedState);
   * ```
   */
  public save(
    userId: string,
    state: CharacterSessionStateData
  ): CharacterSessionStateData {
    this.ensureSeeded(userId);
    const copy = { ...state };
    this.store.set(`${userId}:${state.characterName.toLowerCase()}`, copy);
    return copy;
  }
}

/**
 * Shared singleton instance of `MockCharacterService`.
 */
export const mockCharacterService = new MockCharacterService();
