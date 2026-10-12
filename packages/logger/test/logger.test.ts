/**
 * Unit tests for the Logging class.
 * Tests core logging functionality, configuration, and error handling.
 */

import { logger } from "../src/index";
import { RealmError, UserError, Environment } from "@realm/common";

describe("Logging", () => {
  beforeEach(() => {
    // Reset configuration for each test
    logger.configure({
      environment: Environment.Development,
      enableConsoleLogging: false,
      enableDiscordLogging: false,
    });
  });

  describe("Singleton Pattern", () => {
    /**
     * Test that getLogger always returns the same instance.
     */
    it("should return the same instance on multiple calls", () => {
      const instance1 = logger;
      const instance2 = logger;

      expect(instance1).toBe(instance2);
    });
  });

  describe("Configuration", () => {
    /**
     * Test logger configuration with valid parameters.
     */
    it("should configure logger with valid parameters", () => {
      const config = {
        environment: Environment.Development,
        enableConsoleLogging: false,
        enableDiscordLogging: false,
      };

      expect(() => logger.configure(config)).not.toThrow();
    });

    /**
     * Test app name setting functionality.
     */
    it("should set and get app name correctly", () => {
      const testAppName = "test-app";

      logger.setAppName(testAppName);
      expect(logger.getAppName()).toBe(testAppName);
    });
  });

  describe("Logging Methods", () => {
    beforeEach(() => {
      logger.configure({
        environment: Environment.Development,
        enableConsoleLogging: false, // Disable to avoid console spam during tests
        enableDiscordLogging: false,
      });
    });

    /**
     * Test debug logging functionality.
     */
    it("should log debug messages", () => {
      const consoleSpy = jest.spyOn(console, "debug").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      logger.debug("Test debug message");

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    /**
     * Test info logging functionality.
     */
    it("should log info messages", () => {
      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      logger.info("Test info message");

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    /**
     * Test warning logging functionality.
     */
    it("should log warning messages", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      logger.warn("Test warning message");

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    /**
     * Test error logging functionality.
     */
    it("should log error messages", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      logger.error("Test error message");

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    /**
     * Test logging with additional fields.
     */
    it("should handle logging with additional fields", () => {
      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      logger.info("Test message with fields", {
        fields: {
          userId: "12345",
          action: "test-action",
        },
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    /**
     * Test logging Error objects.
     */
    it("should handle Error objects in logging", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      const testError = new Error("Test error");
      logger.error("Error occurred", { error: testError });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    /**
     * Test auto-location functionality.
     */
    it("should automatically add location to log entry", () => {
      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      logger.info("Test auto-location");

      // Verify that one of the calls contains "Location:"
      const calls = consoleSpy.mock.calls.flat();
      const hasLocation = calls.some(
        (arg) => typeof arg === "string" && arg.includes("Location:")
      );

      expect(hasLocation).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe("Error Types Handling", () => {
    /**
     * Test RealmError handling.
     */
    it("should handle RealmError correctly", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      // Test logged RealmError
      const loggedError = new RealmError("Logged error", {
        log: true,
        fields: { customField: "value" },
      });
      logger.exception("RealmError occurred", loggedError);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.flat();
      const hasFields = calls.some(
        (arg) =>
          typeof arg === "object" &&
          arg !== null &&
          (arg as any).customField === "value"
      );
      expect(hasFields).toBe(true);

      consoleSpy.mockClear();

      // Test unlogged RealmError
      const unloggedError = new RealmError("Unlogged error", {
        log: false,
      });
      logger.exception("Should not log", unloggedError);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    /**
     * Test UserError handling.
     */
    it("should handle UserError correctly (default no log)", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      // UserError defaults to log: false
      const userError = new UserError("User error");
      logger.exception("User error occurred", userError);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockClear();

      // UserError with log: true
      const loggedUserError = new UserError("Important user error", {
        log: true,
      });
      logger.exception("Important user error", loggedUserError);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    /**
     * Test RealmError with cause (Error object).
     */
    it("should handle RealmError with Error cause and preserve stack trace", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      const originalError = new Error("Original failure");
      const realmError = new RealmError("Wrapper error", {
        cause: originalError,
      });

      logger.exception("Error chain", realmError);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.flat();

      // Check if stack trace from original error is present
      const hasOriginalStack = calls.some(
        (arg) =>
          typeof arg === "string" &&
          arg.includes("Original failure") &&
          arg.includes("at ")
      );
      expect(hasOriginalStack).toBe(true);

      // Check if RealmError message is preserved in fields
      const hasWrapperMessage = calls.some(
        (arg) =>
          typeof arg === "object" &&
          arg !== null &&
          (arg as any)["Raised by RealmError"] === "RealmError: Wrapper error"
      );
      expect(hasWrapperMessage).toBe(true);

      consoleSpy.mockRestore();
    });

    /**
     * Test RealmError with unknown cause (arbitrary type).
     */
    it("should handle RealmError with unknown cause", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      const realmError = new RealmError("Wrapper error", {
        cause: { code: 500, details: "Something went wrong" }, // Arbitrary object
      });

      logger.exception("Unknown cause error", realmError);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.flat();

      // The cause should be converted to an Error and its stack trace logged
      // The message of the converted error should be the string representation of the object
      const hasObjectString = calls.some(
        (arg) => typeof arg === "string" && arg.includes("[object Object]")
      );
      expect(hasObjectString).toBe(true);

      consoleSpy.mockRestore();
    });

    /**
     * Test RealmError without cause (should use its own stack trace).
     */
    it("should use RealmError stack trace when no cause is provided", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      const realmError = new RealmError("Standalone error");

      logger.exception("Standalone", realmError);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.flat();

      // Should contain stack trace pointing to where RealmError was created
      const hasStack = calls.some(
        (arg) =>
          typeof arg === "string" &&
          arg.includes("RealmError") &&
          arg.includes("at ")
      );
      expect(hasStack).toBe(true);

      consoleSpy.mockRestore();
    });

    /**
     * Test RealmError with deeply nested cause chain (e.g. DrizzleQueryError -> pg DatabaseError).
     */
    it("should unwrap nested Error causes and extract errorCode into fields", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      logger.configure({
        enableConsoleLogging: true,
      });

      const pgError = Object.assign(
        new Error('relation "discord_guilds" does not exist'),
        { code: "42P01" }
      );
      const drizzleError = new Error(
        'Failed query: select "discord_id" from "discord_guilds"',
        { cause: pgError }
      );
      const realmError = new RealmError(
        "Failed to check discord guild existence",
        { cause: drizzleError }
      );

      logger.exception("Failed to sync guild", realmError);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.flat();

      const hasNestedStack = calls.some(
        (arg) =>
          typeof arg === "string" &&
          arg.includes("Failed query:") &&
          arg.includes("Caused by:") &&
          arg.includes('relation "discord_guilds" does not exist')
      );
      expect(hasNestedStack).toBe(true);

      const hasErrorCodeField = calls.some(
        (arg) =>
          typeof arg === "object" &&
          arg !== null &&
          (arg as Record<string, unknown>).errorCode === "42P01"
      );
      expect(hasErrorCodeField).toBe(true);

      consoleSpy.mockRestore();
    });
  });
});
