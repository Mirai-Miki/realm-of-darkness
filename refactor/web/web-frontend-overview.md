# Web Application Frontend: Next.js Platform & Real-Time Engine

> [!NOTE]
> This document is a high-level architectural overview. Specific page hierarchies, component APIs, state management stores, and visual prototypes will be refined once we dig deeper into this portion of the overhaul.

---

## 1. Executive Summary

`apps/web` is the primary interactive web platform for Realm of Darkness, replacing the legacy React 19 / MUI frontend (`legacy/frontend-legacy`).

It provides:

- **Zero-Polling Real-Time Character Sheets**: Instant tracker mutations, trait ratings, and inventory sync across web tabs and Discord bot commands.
- **Chronicle & Storyteller Management**: Roster administration, character approvals, shared havens, and session notes.
- **User Profile & Supporter Portal**: Discord-linked identity, subscription tiers (Stripe / LemonSqueezy), and server boost management.
- **Interactive Dice Roller**: On-sheet rolls emitting events to Redis, triggering automated Discord message rendering via `apps/discord`'s pure `RenderEngine` (DRY).

---

## 2. Technology Stack & Design Direction

- **Framework**: Next.js (App Router, React 19, Server & Client Components).
- **Styling**: Tailwind CSS + Radix UI primitives.
- **State & Data Fetching**: TanStack Query (for REST data caching and optimistic updates) + Zustand / WebSocket Client (for incoming real-time pushes).
- **Icons & Graphics**: `@realm/assets` (custom dice SVGs, clan badges, blood trackers) + Lucide React.
- **Aesthetic**: Bespoke gothic dark fantasy:
  - Deep obsidian backgrounds (`#0a0a0c`), parchment accents, blood-crimson highlights (`#8a131b`).
  - Tactile interactive trackers: blood vials for Hunger, dual-state slash/cross boxes for Superficial/Aggravated damage, and ornate dot counters for Attributes/Skills.
  - Zero MUI runtime bloat; 100% custom-crafted, responsive component library.

---

## 3. High-Level Component Architecture

```mermaid
flowchart TD
    subgraph WebApp["apps/web (Next.js Application)"]
        subgraph Routes["Page Routes (App Router)"]
            Home["/ (Landing & Dashboard)"]
            Auth["/auth/callback (OAuth Session Landing)"]
            SheetRoute["/characters/:id (Interactive Sheet)"]
            ChronicleRoute["/chronicles/:id (Storyteller Roster)"]
            SupporterRoute["/supporter (Tiers & Server Boosts)"]
        end

        subgraph SheetEngine["Character Sheet Engine"]
            Trackers["Interactive Trackers (Health, Hunger, Willpower)"]
            Attributes["Attributes & Skills Grid (Dot Ratings)"]
            Disciplines["Powers & Banes (Hover Tooltips via @realm/content)"]
            DiceDrawer["Dice Pool Builder & Sound-Enabled Roller"]
        end

        subgraph GatewayClientLayer["Real-Time Gateway Client"]
            WS["WebSocket Client (Auto-reconnect, Heartbeats)"]
            SyncHook["useCharacterSync(characterId)"]
        end
    end

    subgraph BackendGateway["apps/api & Redis Layer"]
        WSGateway["Fastify WebSocket Gateway"]
        Redis["@realm/events (Redis Pub/Sub)"]
    end

    SheetRoute --> SheetEngine
    SheetEngine <==> SyncHook
    SyncHook <==> WS
    WS <===>|WebSockets (Bidirectional)| WSGateway
    WSGateway <===> Redis
```

---

## 4. Key Functional Modules

### A. Character Sheet System

- **Supported Editions**:
  - **5th Edition**: Vampire (V5), Werewolf (W5), Hunter (H5).
  - **20th Edition**: V20, W20, M20, etc.
  - **Chronicles of Darkness**: VTR, etc.
- **Tracker Component Architecture**:
  - Responsive, tactile click handling: single click = Superficial damage (`/`), double click = Aggravated damage (`X`), click again = clear.
  - Hunger: 0–5 blood indicators with rouse check visual triggers.
  - Humanity & Stains: Tenets and touchstone tracking with automatic remorse check integration.
- **Inline Rules Tooltips**:
  - Hovering a Discipline power, Gift, or Bane displays instant rule summaries queried from `@realm/content`.

### B. Chronicle & Storyteller Tools

- **Roster & Overview**: Live tracker statuses for all characters in a coterie/pack.
- **Storyteller Controls**: Spend/award Experience, approve character edits, manage shared Haven stats and blood resonance.
- **Discord Guild Linking**: Associate a web chronicle directly with a Discord server for automatic roll routing and member synchronization.

### C. Supporter & Billing Portal

- Transition from legacy Patreon to **Stripe / LemonSqueezy**.
- Tier status display (Supporter, Patron, Architect).
- Server boost allocation dashboard (assigning boosts to linked Discord servers).

---

## 5. Phasing & Refinement Roadmap

1. **Phase 1: Project Scaffold**: Set up `apps/web` with Next.js, React 19, Tailwind CSS, and monorepo workspace references (`@realm/common`, `@realm/assets`).
2. **Phase 2: Gateway & State Primitives**: Implement `GatewayClient` WebSocket listener and basic layout with session context.
3. **Phase 3: V5 Character Sheet**: Build the flagship V5 vampire sheet with live trackers, attributes, skills, and discipline tooltips.
4. **Phase 4: Dice Roll Drawer & Event Dispatch**: Wire on-sheet dice rolls to emit events to Redis via the API, synchronizing with `apps/discord`.
5. **Phase 5: Chronicle Management & Other Editions**: Implement Storyteller roster views and 20th Edition / CoD sheets.
6. **Phase 6: Billing & Supporter Portal**: Implement Stripe checkout and boost assignment UI.
