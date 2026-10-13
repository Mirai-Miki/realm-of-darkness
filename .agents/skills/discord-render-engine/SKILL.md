---
name: discord-render-engine
description: Enforces architectural conventions for the Discord RenderEngine, UIComponents, and ScreenRecipes. Use this skill whenever creating, modifying, or reviewing Discord UI components, screen recipes, coordinators, modals, or interactions in apps/discord.
---

# Discord RenderEngine & ScreenRecipe Architecture Standards

This skill defines the strict architectural standards for constructing UI in `apps/discord` using the `RenderEngine`, `UIComponent`s, and `ScreenRecipe`s.

---

## 1. Core Principles

1. **Screen Recipes Are Pure Declarative Layouts**:
   - A `ScreenRecipe<TProps>` must **never** instantiate raw Discord.js builders (`ButtonBuilder`, `StringSelectMenuBuilder`, `RoleSelectMenuBuilder`, `UserSelectMenuBuilder`, `ActionRowBuilder`, `ModalBuilder`, `TextInputBuilder`).
   - A `ScreenRecipe` must **never** contain conditional business logic, inline formatting functions, or manual array pushes.
   - A `ScreenRecipe` takes typed `props` and returns a `RenderEnvelope` composed exclusively of calls to `UIComponent`s inside `primary.body` (and optional `followUps`).

2. **UIComponents Encapsulate Widget Construction**:
   - All builder instantiation, button styling, emojis, select menu options, row wrapping (`ActionRowBuilder`), and conditional widget logic belong inside dedicated `UIComponent` functions in `src/ui/components/`.
   - Every `UIComponent` is a pure function mapping typed `props` to a `UIFragment` (`(props: TProps) => UIFragment`).
   - Reusable widgets (e.g. Back button, Confirmation bar, Dividers, Text blocks) live in `src/ui/components/common/`.
   - Feature-specific widgets live in their respective folder under `src/ui/components/<feature>/` (e.g. `character/`, `chronicle/`, `guild/`, `dice/`).

3. **Stateless Session Wire Protocol**:
   - Interactive components (buttons, select menus, modals) must encode their `customId` using:
     ```typescript
     encodeSessionCustomId(handlerId, sessionId, control)
     ```
   - Never use `MessageComponentCollector` or ephemeral in-memory state for interactions. All workflow state is persisted in PostgreSQL `interaction_sessions`.

4. **Pure Engine & Dispatcher Delivery**:
   - `RenderEngine` is 100% pure: it flattens `UIFragment` trees, filters falsy conditionals, collapses duplicate dividers, and produces a `NormalizedRenderEnvelope`.
   - Coordinators return `renderEngine.build(Recipe, props)`.
   - Only `InteractionDispatcher` touches Discord's REST API (`reply`, `update`, `editReply`, `showModal`, `followUp`).

---

## 2. Anti-Patterns & Prohibited Code in Recipes

### ❌ PROHIBITED in `*.recipes.ts`:
```typescript
// ❌ WRONG: Instantiating Discord builders directly in a recipe
export const BadRecipe: ScreenRecipe<Props> = ({ sessionId }) => {
  const btn = new ButtonBuilder()
    .setCustomId(...)
    .setLabel("Click Me");
  const row = new ActionRowBuilder().addComponents(btn);

  return {
    primary: {
      ephemeral: true,
      body: [row],
    },
  };
};

// ❌ WRONG: Inline conditionals in a recipe
export const AnotherBadRecipe: ScreenRecipe<Props> = ({ character }) => {
  const options = [];
  if (character.splat === Splat.Vampire5th) {
    options.push(...);
  }
  // ...
};
```

### ✅ CORRECT: Encapsulate in `UIComponent`, Compose in Recipe:
```typescript
// 1. In src/ui/components/feature/my-actions.component.ts:
export const MyActionsComponent: UIComponent<MyActionsProps> = ({ handlerId, sessionId, character }) => {
  const btn = new ButtonBuilder()
    .setCustomId(encodeSessionCustomId(handlerId, sessionId, MyControl.Action))
    .setLabel("Click Me")
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(btn);
};

// 2. In src/features/feature/my-feature.recipes.ts:
export const GoodRecipe: ScreenRecipe<Props> = ({ sessionId, character }) => ({
  primary: {
    ephemeral: true,
    body: [
      TextBlockComponent({ content: "# Title" }),
      DividerComponent(),
      MyActionsComponent({ handlerId: MY_HANDLER_ID, sessionId, character }),
    ],
  },
});
```

---

## 3. Directory Layout for UI & Recipes

```
apps/discord/src/
├── features/
│   ├── <feature>/
│   │   ├── <feature>.coordinator.ts        # Coordinator handling slash command & interactions
│   │   ├── <feature>-session.definitions.ts # Session schemas, controls, and workflows
│   │   └── <feature>.recipes.ts            # PURE Screen Recipes (no builders!)
├── ui/
│   ├── components/
│   │   ├── common/                         # Universal building blocks (ConfirmationBar, BackButton, TextBlock)
│   │   ├── character/                      # Character widgets (Identity, Trackers, Traits, Tabs, QuickActions)
│   │   ├── chronicle/                      # Chronicle widgets (DashboardActions, Storytellers, EditionSelect)
│   │   ├── guild/                          # Guild widgets (Settings, StorytellerSelectors)
│   │   └── dice/                           # Dice widgets (DiceTray, OutcomeBanner, RouseBadge)
│   ├── engine/
│   │   ├── render-engine.ts                # Pure engine normalizer
│   │   └── render-engine.types.ts          # UIComponent, UIFragment, ScreenRecipe types
│   └── recipes/
│       └── error.recipes.ts                # System-wide global recipes (ErrorAlertRecipe)
```

---

## 4. Modal Conventions

Modals require `ModalBuilder`. Encapsulate modal generation into dedicated modal builder factory functions in `src/ui/components/<feature>/`:
```typescript
// src/ui/components/character/character-bio-modal.component.ts
export function createCharacterBioModal(props: CharacterBioModalProps): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(encodeSessionCustomId(props.handlerId, props.sessionId, CharacterControl.EditBioModal))
    .setTitle(`Edit ${props.characterName}`)
    .addComponents(...);
}

// In *.recipes.ts:
export const EditCharacterBioModalRecipe: ScreenRecipe<CharacterBioModalProps> = (props) => ({
  kind: "modal",
  modal: createCharacterBioModal(props),
});
```

---

## 5. Review Checklist Before Finalizing Any UI Work

- [ ] Does any `*.recipes.ts` file import `ActionRowBuilder`, `ButtonBuilder`, `StringSelectMenuBuilder`, or other Discord builder classes? **(Must be 0)**.
- [ ] Are all buttons, dropdowns, and modals encapsulated inside `src/ui/components/`?
- [ ] Does every interactive component use `encodeSessionCustomId` with a valid `handlerId`, `sessionId`, and `control`?
- [ ] Are shared UI components (e.g. Back button, confirmation bar) placed in `src/ui/components/common/` rather than duplicated?
- [ ] Do all tests in `apps/discord/test/` pass without errors?
