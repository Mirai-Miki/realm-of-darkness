# Discord App — Remaining Feature & Refactor Task List

This document tracks the remaining end-to-end features and systems to complete for `apps/discord`, built on top of our established foundation:

- **MDX Command SSOT** (`packages/content/collections/documentation/discord/commands/*.mdx`)
- **Stateless PostgreSQL Sessions** (`interaction_sessions` with 60-day TTL & Shard 0 12-hour cleanup via [`SessionCleanupService`](../src/framework/session-cleanup.service.ts))
- **Coordinator + Pure `RenderEngine` + `InteractionDispatcher` Pipeline** ([`architecture.md`](./architecture.md))

---

## Completed Foundation ✅

- [x] **Hybrid Character Database & Repository** (`@realm/database`, `@realm/repositories`, `@realm/core`)
- [x] **Stateless Interaction Session Store** (`interaction_sessions` table, `InteractionSessionRepository`, 60-day TTL, Shard 0 12-hour sweeper)
- [x] **MDX Command Manifest Loader & Builder** (`@realm/content` $\rightarrow$ `buildSlashCommandFromMdx`)
- [x] **Pure `RenderEngine` & `InteractionDispatcher`** (Composable `UIComponent`s, `ScreenRecipe`s, multi-message `followUps` support, centralized bubble-up `ErrorAlertRecipe`)
- [x] **End-to-End Prototype `/character` Flow** (Autocomplete, Typo Confirmation, Splat/Clan Creation Wizard, Editor Dashboard, Bio Modal)
- [x] **Deprecated Pre-Recipe View/Handler Cleanup** (Removed legacy `.view.ts`, `.handler.ts`, and `InterfaceHandler` stubs)

---

## Upcoming End-to-End Tasks 🚀

### 1. Dice Commands (`/roll` & Fast RPG Actions)

Build the unified dice rolling suite connecting `@realm/core` dice services (`V5DiceService`, `W5DiceService`, `H5DiceService`, `WoD20DiceService`, `CoDDiceService`) and `@realm/assets` custom dice emojis to the `RenderEngine`.

- [ ] **MDX Command Definitions**: Author command MDX specs in `packages/content/collections/documentation/discord/commands/` for dice rolling (V5, W5, H5, WoD 20th, CofD, and simple dice).
- [ ] **Composable Dice UI Components**:
  - Dice tray component rendering custom application emojis (`@realm/assets` + `emoji-manager.ts`).
  - Outcome banner component (Critical Success, Messy Critical, Bestial Failure, Brutal Outcome, Botch).
  - Public interactive buttons (e.g., **Willpower Reroll** / **Rouse Check**) backed by 60-day PostgreSQL `interaction_sessions`.
- [ ] **Character-Linked Rolls & Multi-Message Envelopes**:
  - Support rolling with an active character's sheet values.
  - When a roll triggers a Rouse Check or Willpower expenditure that mutates the character, return a multi-message `RenderEnvelope`:
    - `primary`: Public dice roll result + Rouse check outcome.
    - `followUps`: Ephemeral `CharacterTrackersComponent` showing the updated Hunger/Willpower state.

---

### 2. Character Commands (`/character` Real DB Persistence & Multi-Splat Expansion)

Transition `/character` from `MockCharacterService` to real PostgreSQL persistence via `CharacterRepository` and `@realm/core` domain entities.

- [ ] **Database Wiring**: Replace `mockCharacterStore` in `CharacterCoordinator` with `CharacterRepository` (`@realm/repositories`) and `CharacterFactory` (`@realm/core`).
- [ ] **Active Character Context**: Support resolving and switching a player's active character per guild/chronicle.
- [ ] **Mechanics Content Registry Integration (`@realm/content`)**: Load clans, disciplines, banes, predator types, and powers from `packages/content/collections/mechanics/` so creation wizards and sheet editors are driven by static MDX content rather than hardcoded arrays.
- [ ] **Splat-Specific Sub-Coordinators & Recipes**:
  - Expand V5 (`Vampire5th`), V20 (`Vampire20th`), W5, H5, and CofD creation steps and sheet tabs (Attributes, Skills, Disciplines/Powers, Merits/Backgrounds, Experience expenditure).
  - Add safe character deletion confirmation flow.

---

### 3. 20th Edition Initiative Tracker (`/initiative`)

Implement channel-scoped combat & turn order tracking backed by the `initiative_trackers` table in `@realm/database`.

- [ ] **Repository Layer**: Verify/complete `InitiativeRepository` in `@realm/repositories`.
- [ ] **MDX Command Definition**: Define `/initiative` in `packages/content/collections/documentation/discord/commands/initiative.mdx`.
- [ ] **Initiative Coordinator & Recipes**:
  - Start/reset combat round in a channel.
  - Add/remove combatants (linked to characters or NPCs with dexterity/wits + 1d10 rolls).
  - Interactive turn advancement (`[Next Turn]`, `[Reroll Initiative]`, `[End Combat]`) rendered via Components V2.

---

### 4. Guild Setup Wizard & Settings (`/setup` / `/settings`)

Provide an interactive onboarding and configuration workflow for Discord server administrators and Storytellers.

- [ ] **MDX Command Definition**: Define guild setup/settings command in `packages/content`.
- [ ] **Guild Setup Wizard Coordinator & Recipes**:
  - Step-by-step interactive wizard for configuring a newly joined Discord server (`discord_guilds` and default `chronicles`).
  - Configure default game system/edition, Storyteller roles, roll channels, and logging preferences.
  - Interactive dashboard for updating server settings in place.

---

### 5. Chronicle Management Command (`/chronicle`)

Implement multi-chronicle management for Discord guilds using `ChronicleRepository`, `DiscordGuildChronicleRepository`, and `ChronicleMemberRepository`.

- [ ] **MDX Command Definition**: Define `/chronicle` in `packages/content/collections/documentation/discord/commands/chronicle.mdx`.
- [ ] **Shared Chronicle Selection Component/Recipe**:
  - When a command requires chronicle context in a guild with multiple chronicles (and the context is ambiguous), inject a reusable Chronicle Selection screen recipe before proceeding.
- [ ] **Chronicle Coordinator & Core Actions**:
  - **Create Chronicle**: Shared action in `@realm/core` (usable by both Discord and Web API) + Discord confirmation recipe.
  - **Chronicle Settings**: View and edit chronicle name, description, active splat/system, Storyteller roles, and theme color.
  - **Chronicle Roster**: View and manage players and characters assigned to the chronicle.
  - **Delete Chronicle (Last-Chronicle Safeguard)**:
    - Shared deletion logic in `@realm/core`.
    - Because every Discord guild must have at least one attached chronicle, if a user attempts to delete the **last** chronicle in a guild, display a confirmation warning explaining that a new default chronicle will automatically be created to replace it (or advise removing the bot from the server if they wish to remove all data).

---

### 6. Redis Events (Inter-App Communication via `@realm/events`)

Connect `apps/discord` and `apps/api` via the `@realm/events` Redis pub/sub client so state changes propagate across apps in real time.

- [ ] **Event Client Lifecycle**: Initialize and connect `EventClient` (`@realm/events`) in `apps/discord` on startup and gracefully disconnect on shutdown.
- [ ] **Outbound Discord Events**: Publish events when characters, chronicles, or dice rolls are updated from Discord.
- [ ] **Inbound API Events**: Subscribe to events emitted by `apps/api` (e.g., web sheet edits, web dice rolls, chronicle updates) to trigger Discord channel notifications or live state syncs.
