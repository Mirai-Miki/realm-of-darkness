# Character Module

This module provides validation schemas, types, and DTOs for character-related data in the World of Darkness system. Files are organized by game version to keep related definitions together.

## 📁 File Structure

```
character/
├── character.definitions.ts        # Base character definitions (common across all games)
├── character-5th.definitions.ts    # 5th Edition specific definitions
├── character-20th.definitions.ts   # 20th Anniversary specific definitions
├── v5.definitions.ts               # Vampire: The Masquerade 5th Edition
├── hunter5th.definitions.ts        # Hunter: The Vigil 5th Edition
├── werewolf5th.definitions.ts      # Werewolf: The Apocalypse 5th Edition
├── human5th.definitions.ts         # Human 5th Edition
├── ghoul5th.definitions.ts         # Ghoul 5th Edition
├── vampire20th.definitions.ts      # Vampire: The Masquerade 20th Anniversary
├── werewolf20th.definitions.ts     # Werewolf: The Apocalypse 20th Anniversary
├── changeling20th.definitions.ts   # Changeling: The Dreaming 20th Anniversary
├── mage20th.definitions.ts         # Mage: The Ascension 20th Anniversary
├── demon20th.definitions.ts        # Demon: The Fallen 20th Anniversary
├── wraith20th.definitions.ts       # Wraith: The Oblivion 20th Anniversary
├── human20th.definitions.ts        # Human 20th Anniversary
├── ghoul20th.definitions.ts        # Ghoul 20th Anniversary
└── index.ts                        # Barrel exports
```

## 🧱 File Contents

Each definitions file contains everything needed for that specific game version:

- **Constants**: Business rules and validation constraints
- **Enums**: Game-specific enumerations using `as const` pattern
- **Fields**: Zod schemas for individual data fields
- **Data Types**: Partial structures for internal use
- **DTOs**: Full structures for public API use

### Base Files

- `character.definitions.ts`: Common definitions shared across all character types (IDs, timestamps, basic fields)
- `character-5th.definitions.ts`: 5th Edition shared definitions (health, willpower, attributes, skills)
- `character-20th.definitions.ts`: 20th Anniversary shared definitions

### Game-Specific Files

Each game file (e.g., `v5.definitions.ts`) includes:

- Game-specific constants (e.g., hunger ranges, blood potency limits)
- Game-specific enums (e.g., clans, disciplines)
- Game-specific fields (e.g., hunger, humanity, blood potency)
- Partial data structures for that character type
- Full DTOs for API use

## 📝 Conventions

### File Naming

- Base files: `character-{edition}.definitions.ts`
- Game files: `{game}.definitions.ts` (e.g., `v5.definitions.ts`)
- All files use kebab-case with `.definitions.ts` suffix

### Code Organization

```typescript
// Each file follows this structure:
import { z } from "zod";

// 1. Constants (business rules)
export const V5_CONSTANTS = {/* ... */} as const;

// 2. Enums (using as const pattern)
export const V5Clan = {/* ... */} as const;
export const V5ClanSchema = z.enum(
  Object.values(V5Clan) as [string, ...string[]]
);
export type V5Clan = (typeof V5Clan)[keyof typeof V5Clan];

// 3. Fields (Zod schemas)
export const V5HungerField = z.int().min(0).max(5);

// 4. Data Types (partial structures)
export interface V5Data {
  /* ... */
}

// 5. DTOs (full structures for public use)
export const V5Dto = z.object({/* ... */});
export type V5Dto = z.infer<typeof V5Dto>;
```

### Imports

- Import from base files first, then game-specific
- Use barrel exports from `index.ts` for clean imports
- Type-only imports for types: `import type { V5Data } from "./v5.definitions"`

## 🔄 Usage Examples

### In API Controllers

```typescript
import { V5DtoSchema, CreateV5CommandDtoSchema } from "@realm/common/character";

@Post()
async createV5(@Body() dto: unknown) {
  const validated = CreateV5CommandDtoSchema.parse(dto);
  // ... business logic
  return V5DtoSchema.parse(result);
}
```

### In Domain Models

```typescript
import { V5_RULES } from "@realm/common/character";

export class Vampire5th {
  increaseHunger(amount: number) {
    this.hunger = Math.min(V5_RULES.hunger.max, this.hunger + amount);
  }
}
```

### In Repositories

```typescript
import type { V5Data } from "@realm/common/character";

const character: V5Data = {/* ... */};
```

## ✅ Best Practices

- **Single Source of Truth**: Define constants once per game version
- **Type Safety**: Use Zod schemas for validation and TypeScript types
- **Composition**: Build complex DTOs by combining fields from multiple files
- **No Duplication**: Reference constants in both Zod schemas and domain logic
- **Clear Naming**: Use descriptive names that include the game version

## 🚀 Adding New Definitions

1. Create new file: `{game}.definitions.ts`
2. Define constants, enums, fields, data types, and DTOs
3. Export from `index.ts`
4. Update dependent packages to use new definitions

This structure keeps related code together while maintaining clear separation between game versions.
