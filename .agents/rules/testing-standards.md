# Testing Standards & Guidelines

This document outlines the testing architecture, naming conventions, and best practices across the Realm of Darkness monorepo.

## 1. Test Pyramid & Classifications

Every module, entity, and repository must have dedicated tests matching its architectural layer:

1. **Unit Tests (`*.test.ts` or `*.spec.ts`)**:
   - Focus: Pure domain logic, value objects, Zod input validation schemas, helper functions, and error handling.
   - Execution: In-memory, zero database/network I/O, lightning fast.
   - File location: Inside the package's `test/` directory or alongside the file under test (e.g., `packages/common/test/character-schemas.test.ts`).

2. **Feature / Integration Tests**:
   - Focus: Verifying interoperability between layers (e.g. Repository <-> Database mapper, Entity Factory <-> Serialized DTO, View component contracts).
   - Test data: Mock or transaction-wrapped database fixtures.
   - Assertions: Verify that hydration, serialization, and boundary validations work symmetrically.

3. **System / End-to-End Tests**:
   - Focus: Discord interaction flows, command execution contexts, and API endpoints.

## 2. Naming Conventions & Structure

- Test files must end with `.test.ts`.
- Describe blocks should name the component or class under test:
  ```typescript
  describe("CharacterRepository", () => {
    describe("findById", () => {
      it("should return hydrated character data when record exists", async () => { ... });
      it("should return null when record does not exist", async () => { ... });
      it("should reject corrupted JSONB payload with ZodError or RealmError", async () => { ... });
    });
  });
  ```
- Use the **AAA** pattern (Arrange, Act, Assert) cleanly inside each test.

## 3. Mocking & Dependencies

- Never mock business rules or domain value objects; test real domain logic.
- Mock external boundaries (PostgreSQL database queries, Discord REST client, Redis connections).
- Always clean up mocks in `afterEach` or let Jest's `clearMocks: true` handle it.

## 4. Verification Workflow

Before marking any task as complete:
1. `pnpm format`
2. `pnpm lint`
3. `pnpm test` (must pass with 0 failures)
4. `pnpm --filter <target> build`
