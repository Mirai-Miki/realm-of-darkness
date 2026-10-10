import type { LoggerConfig, LogEntry } from "./logger.types";

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { HTTPError } from "discord.js";
import {
  RealmError,
  LogLevelNameSchema,
  type ILogger,
  type LogOptions,
} from "@realm/common";
import { DiscordLogger } from "./discord-logger";
import { FileLogger } from "./file-logger";
import { LogLevel, Environment } from "@realm/common";
import {
  getLogLevelName,
  getLogLevelFromName,
  getColor,
  getLogLevelColor,
  formatTimestamp,
} from "./logger.utils";
import { Color } from "./logger.types";

/**
 * Singleton logger class for the Realm of Darkness application.
 * Provides async logging with Discord integration and file backup.
 *
 * Implements the ILogger interface from @realm/common.
 *
 * Source map support is automatically initialized when this module is imported,
 * providing enhanced stack traces for TypeScript code.
 */
class Logger implements ILogger {
  private appName: string = "unknown-app";
  private environment: Environment = Environment.Development;
  private discordLogger?: DiscordLogger;
  private fileLogger?: FileLogger;
  private minLevelPriority: LogLevel = LogLevel.Debug;
  private enableConsoleLogging: boolean = true;
  private enableDiscordLogging: boolean = false;
  private projectRoot: string;

  /**
   * Private constructor to enforce singleton pattern.
   * Also sets up global error handlers for unhandled rejections and exceptions.
   */
  constructor() {
    // Find the monorepo root
    this.projectRoot = this.findProjectRoot();

    // Load environment variables
    dotenv.config({
      path: path.join(this.projectRoot, ".env"),
      quiet: true,
    });
    this.initializeFromEnv();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Finds the monorepo root by traversing up from the current directory
   * looking for pnpm-workspace.yaml.
   *
   * @returns The absolute path to the project root
   */
  private findProjectRoot(): string {
    let currentDir = process.cwd();

    // Traverse up the directory tree looking for pnpm-workspace.yaml
    while (currentDir !== path.dirname(currentDir)) {
      const workspaceFile = path.join(currentDir, "pnpm-workspace.yaml");
      if (fs.existsSync(workspaceFile)) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    // Fallback to two levels up from cwd (assumes package structure)
    return path.resolve(process.cwd(), "../..");
  }

  /**
   * Sets up global error handlers for unhandled promise rejections and uncaught exceptions.
   * This ensures that critical errors are always logged even if not explicitly caught.
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections in all environments
    process.on("unhandledRejection", (reason: unknown) => {
      this.fatal("Unhandled Promise Rejection", {
        fields: {
          Reason: String(reason),
          Environment: process.env.NODE_ENV || "unknown",
        },
      });
    });

    // Handle uncaught exceptions in all environments
    process.on("uncaughtException", (error: Error) => {
      this.fatal("Uncaught Exception", {
        fields: {
          Error: error.message,
          Stack: error.stack || "No stack trace",
          Environment: process.env.NODE_ENV || "unknown",
        },
      });
    });
  }

  /**
   * Sets the application name for this logger.
   *
   * @param appName - The name of the application
   */
  public setAppName(appName: string): void {
    this.appName = appName;

    // Reinitialize file logger with new app name if backup logging is enabled
    if (this.fileLogger) {
      const backupPath =
        process.env.LOG_FILE_PATH ||
        path.join(process.cwd(), "../../", "logs", `${appName}.log`);
      this.fileLogger = new FileLogger(backupPath);
    }
  }

  /**
   * Gets the current application name.
   *
   * @returns The current application name
   */
  public getAppName(): string {
    return this.appName;
  }

  /**
   * Configures the logger with custom settings.
   * This allows overriding environment-based defaults.
   *
   * @param config - Custom logger configuration
   */
  public configure(config: Partial<LoggerConfig>): void {
    if (config.environment) {
      this.environment = config.environment;
    }

    if (config.enableConsoleLogging !== undefined) {
      this.enableConsoleLogging = config.enableConsoleLogging;
    }

    if (config.enableDiscordLogging !== undefined) {
      this.enableDiscordLogging = config.enableDiscordLogging;
    }

    if (config.customMinLogLevel) {
      this.minLevelPriority = config.customMinLogLevel;
    }

    // Reinitialize loggers if needed
    this.initializeLoggers(config);
  }

  /**
   * Initializes the logger from environment variables.
   */
  private initializeFromEnv(): void {
    // Determine environment
    const nodeEnv = process.env.NODE_ENV;
    switch (nodeEnv) {
      case Environment.Production:
        this.environment = Environment.Production;
        this.enableConsoleLogging = false;
        this.enableDiscordLogging = true;
        this.minLevelPriority = LogLevel.Warn;
        break;
      case Environment.Preproduction:
        this.environment = Environment.Preproduction;
        this.enableConsoleLogging = false;
        this.enableDiscordLogging = true;
        this.minLevelPriority = LogLevel.Info;
        break;
      case Environment.Development:
        this.environment = Environment.Development;
        this.enableConsoleLogging = true;
        this.enableDiscordLogging = false;
        this.minLevelPriority = LogLevel.Debug;
        break;
      default:
        throw new RealmError(
          `Invalid NODE_ENV value: "${nodeEnv}". Expected one of: development, preproduction, production.`
        );
    }

    // Override with environment variables if present
    if (process.env.ENABLE_CONSOLE_LOGGING !== undefined) {
      this.enableConsoleLogging = process.env.ENABLE_CONSOLE_LOGGING === "true";
    }

    if (process.env.ENABLE_DISCORD_LOGGING !== undefined) {
      this.enableDiscordLogging = process.env.ENABLE_DISCORD_LOGGING === "true";
    }

    if (process.env.LOGGER_LEVEL) {
      const selectedLevel = LogLevelNameSchema.safeParse(
        process.env.LOGGER_LEVEL.toLowerCase()
      );
      if (!selectedLevel.success) {
        throw new RealmError(
          `Invalid LOGGER_LEVEL value: "${process.env.LOGGER_LEVEL}".`
        );
      }
      this.minLevelPriority = getLogLevelFromName(selectedLevel.data);
    }

    this.initializeLoggers();
  }

  /**
   * Initializes the Discord and file loggers based on current configuration.
   */
  private initializeLoggers(config?: Partial<LoggerConfig>): void {
    const discordToken = config?.discordToken || process.env.LOGGER_TOKEN;
    const discordChannelId =
      config?.discordChannelId || process.env.LOGGER_CHANNEL_ID;
    const backupLogPath =
      config?.backupLogPath ||
      process.env.LOG_FILE_PATH ||
      path.join(process.cwd(), "../..", "logs", `${this.appName}.log`);

    // Initialize Discord logger if enabled and configured
    if (this.enableDiscordLogging && discordToken && discordChannelId) {
      this.discordLogger = new DiscordLogger(discordToken, discordChannelId);
    } else {
      this.discordLogger = undefined;
    }

    // Initialize file logger as backup
    this.fileLogger = new FileLogger(backupLogPath);
  }

  /**
   * Logs a debug message.
   *
   * @param message - The debug message
   * @param options - Additional logging options
   * @returns Promise that resolves when logging is complete
   */
  public debug(message: string, options: LogOptions = {}): void {
    this.log(LogLevel.Debug, message, options);
  }

  /**
   * Logs an info message.
   *
   * @param message - The info message
   * @param options - Additional logging options
   * @returns Promise that resolves when logging is complete
   */
  public info(message: string, options: LogOptions = {}): void {
    this.log(LogLevel.Info, message, options);
  }

  /**
   * Logs a warning message.
   *
   * @param message - The warning message
   * @param options - Additional logging options
   */
  public warn(message: string, options: LogOptions = {}): void {
    this.log(LogLevel.Warn, message, options);
  }

  /**
   * Logs an error message.
   *
   * @param message - The error message
   * @param options - Additional logging options
   * @returns Promise that resolves when logging is complete
   */
  public error(message: string, options: LogOptions = {}): void {
    this.log(LogLevel.Error, message, options);
  }

  /**
   * Logs a fatal error message.
   *
   * @param message - The fatal error message
   * @param options - Additional logging options
   * @returns Promise that resolves when logging is complete
   */
  public fatal(message: string, options: LogOptions = {}): void {
    this.log(LogLevel.Fatal, message, options);
  }

  /**
   * Logs a RealmError with all its metadata.
   * If the error has log=false, it will be logged at Debug level instead of Error level.
   * This allows filtering in production while preserving logs in development.
   *
   * @param error - The error to log
   * @param additionalOptions - Additional logging options to merge
   * @returns Promise that resolves when logging is complete
   */
  public exception(
    message: string,
    error: unknown,
    additionalOptions: Omit<LogOptions, "error"> = {}
  ): void {
    const options: LogOptions = {
      fields: additionalOptions.fields,
      error: error,
    };

    this.log(LogLevel.Error, message, options);
  }

  /**
   * Core logging method that handles the actual log processing.
   *
   * @param level - The log level
   * @param message - The log message
   * @param options - Additional logging options
   * @returns Promise that resolves when logging is complete
   */
  private log(
    level: LogLevel,
    message: string,
    options: LogOptions = {}
  ): void {
    // Check if the error has log=false and downgrade to Debug level
    // This must happen BEFORE the minLevelPriority check
    if (options.error instanceof RealmError && !options.error.log) {
      level = LogLevel.Debug;
    }

    // Check if this log level should be processed
    if (level < this.minLevelPriority) {
      return;
    }
    // Need to be extra safe here since an error here could remain uncaught
    try {
      if (this.shouldIgnore(options.error)) return;
      const logEntry = this.createLogEntry(level, message, options);

      // Log to console if enabled
      if (this.enableConsoleLogging) {
        this.logToConsole(logEntry);
      }

      // Attempt async logging (don't await to avoid blocking)
      this.logAsync(logEntry).catch((error) => {
        // If async logging fails completely, fall back to console error
        console.error("Failed to log message:", error);
        console.error("Original log entry:", logEntry);
      });
    } catch (error) {
      console.error("Failed to log message:", error);
    }
  }

  private shouldIgnore(error: unknown) {
    // Ignore errors I cannot control
    if (error instanceof HTTPError) return true;
    return false;
  }

  /**
   * Gets the current environment.
   *
   * @returns The current environment
   */
  public getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Checks if Discord logging is enabled.
   *
   * @returns True if Discord logging is enabled
   */
  public isDiscordLoggingEnabled(): boolean {
    return this.enableDiscordLogging && !!this.discordLogger;
  }

  /**
   * Checks if console logging is enabled.
   *
   * @returns True if console logging is enabled
   */
  public isConsoleLoggingEnabled(): boolean {
    return this.enableConsoleLogging;
  }

  /**
   * Creates a log entry from the provided parameters.
   *
   * @param level - The log level
   * @param message - The log message
   * @param options - Additional logging options
   * @returns The created log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    options: LogOptions
  ): LogEntry {
    const logEntry: LogEntry = {
      level,
      message,
      appName: this.appName,
      timestamp: new Date(),
    };

    // Add location if provided
    const callerLocation = this.getCallerLocation();
    if (callerLocation) {
      logEntry.location = callerLocation;
    }

    // Add stack trace if an error is provided
    if (options.error) {
      let errorToLog: Error;

      if (options.error instanceof RealmError && options.error.cause) {
        errorToLog = options.error.cause;
      } else if (options.error instanceof Error) {
        errorToLog = options.error;
      } else {
        try {
          errorToLog = new Error(JSON.stringify(options.error));
        } catch {
          errorToLog = new Error(String(options.error as any));
        }
      }

      logEntry.stackTrace = errorToLog.stack;
    }

    // Add additional fields
    if (
      options.fields ||
      (options.error instanceof RealmError && options.error.fields) ||
      (options.error instanceof RealmError && options.error.cause)
    ) {
      logEntry.fields = {
        ...options.fields,
        ...(options.error instanceof RealmError ? options.error.fields : {}),
        ...(options.error instanceof RealmError && options.error.cause
          ? {
              "Raised by RealmError": `${options.error.name}: ${options.error.message}`,
            }
          : {}),
      };
    }

    return logEntry;
  }

  /**
   * Handles async logging to Discord and file backup.
   *
   * @param logEntry - The log entry to process
   * @returns Promise that resolves when all logging attempts are complete
   */
  private async logAsync(logEntry: LogEntry): Promise<void> {
    let discordSuccess = false;

    // Try Discord logging first if enabled
    if (this.enableDiscordLogging && this.discordLogger) {
      try {
        await this.discordLogger.sendLog(logEntry);
        discordSuccess = true;
      } catch (error) {
        // Discord logging failed, we'll fall back to file logging
        if (this.enableConsoleLogging) {
          console.warn("Discord logging failed:", error);
        }
      }
    }

    // If Discord failed or isn't configured, use file backup
    if (!discordSuccess && this.fileLogger) {
      try {
        await this.fileLogger.writeLog(logEntry);
      } catch {
        // Both Discord and file logging failed
        throw new Error(
          `All logging methods failed. Discord: ${!this.discordLogger ? "not configured" : "failed"}`
        );
      }
    }

    // If neither Discord nor file logging worked, that's a configuration issue
    if (!this.enableDiscordLogging && !this.fileLogger) {
      throw new Error(
        "No logging methods configured. Please configure either Discord or file logging."
      );
    }
  }

  /**
   * Logs a message to the console with appropriate formatting and colors.
   * Uses absolute paths for VSCode clickability.
   *
   * @param logEntry - The log entry to log to console
   */
  private logToConsole(logEntry: LogEntry): void {
    const timestamp = formatTimestamp(logEntry.timestamp);
    const level = logEntry.level;
    const levelName = getLogLevelName(level).toUpperCase();

    const consoleMethod = this.getConsoleMethod(logEntry.level);
    consoleMethod(
      `${getColor(Color.Cyan)}[${timestamp}] [${logEntry.appName}]${getColor(Color.Reset)} ${getLogLevelColor(level)}[${levelName}] - ${logEntry.message}${getColor(Color.Reset)}`
    );

    if (logEntry.location) {
      // Convert relative path to absolute for VSCode clickability
      const absolutePath = path.join(this.projectRoot, logEntry.location);
      consoleMethod(
        `${getColor(Color.Gray)}Location: ${getColor(Color.Reset)}${getColor(Color.Green)}${absolutePath}${getColor(Color.Reset)}`
      );
    }

    if (logEntry.fields && Object.keys(logEntry.fields).length > 0) {
      consoleMethod(
        `${getColor(Color.Gray)}Fields:${getColor(Color.Reset)}`,
        logEntry.fields
      );
    }

    if (logEntry.stackTrace) {
      consoleMethod(
        `${getColor(Color.Gray)}Stack Trace:${getColor(Color.Reset)}\n${getColor(Color.Red)}${logEntry.stackTrace}${getColor(Color.Reset)}`
      );
    }
    consoleMethod(""); // Empty line for spacing
  }

  /**
   * Gets the appropriate console method for a log level.
   *
   * @param level - The log level
   * @returns The console method to use
   */
  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case LogLevel.Debug:
        // eslint-disable-next-line no-console
        return console.debug;
      case LogLevel.Info:
        // eslint-disable-next-line no-console
        return console.info;
      case LogLevel.Warn:
        return console.warn;
      case LogLevel.Error:
      case LogLevel.Fatal:
        return console.error;
      default:
        // eslint-disable-next-line no-console
        return console.log;
    }
  }

  /**
   * Gets the location of the caller (file and line number).
   * Returns path relative to the project root.
   *
   * @returns The caller's location or undefined if not found
   */
  private getCallerLocation(): string | undefined {
    const error = new Error();
    const stack = error.stack?.split("\n");

    if (!stack) return undefined;

    // Find the first line that isn't part of the logger
    // Stack trace usually looks like:
    // Error
    //     at Logger.getCallerLocation (logger.ts:x:y)
    //     at Logger.createLogEntry (logger.ts:x:y)
    //     at Logger.log (logger.ts:x:y)
    //     at Logger.info (logger.ts:x:y)
    //     at Object.<anonymous> (caller.ts:x:y)
    for (const line of stack) {
      if (
        !line.includes("Logger.") &&
        !line.includes("new Error") &&
        !line.includes("node_modules") &&
        line.includes(path.sep)
      ) {
        // Extract file path and line number
        // Format is usually "    at FunctionName (filepath:line:column)" or "    at filepath:line:column"
        const match =
          line.match(/\((.+):(\d+):\d+\)/) || line.match(/at (.+):(\d+):\d+/);
        if (match) {
          const filePath = match[1];
          const lineNum = match[2];

          // Make path relative to project root (not cwd)
          // This gives us paths like 'apps\bot\src\commands\dice.ts:42'
          const relativePath = path.relative(this.projectRoot, filePath);
          return `${relativePath}:${lineNum}`;
        }
      }
    }

    return undefined;
  }
}

/**
 * Singleton logger instance.
 *
 * This ensures all imports within the same application (process) get the same logger instance,
 * allowing you to set the app name once and have it persist across all imports.
 *
 * Different applications (bot vs API vs frontend) run in separate memory spaces,
 * so each gets its own singleton instance.
 *
 * @example
 * ```typescript
 * // In bot/src/main.ts
 * import { logger } from "@realm/logger";
 * logger.setAppName("bot");
 *
 * // In bot/src/commands/dice.ts
 * import { logger } from "@realm/logger"; // Same instance!
 * console.log(logger.getAppName()); // "bot"
 * ```
 */
let _logger: Logger | null = null;

export const logger = (() => {
  if (!_logger) {
    _logger = new Logger();
  }
  return _logger;
})();
