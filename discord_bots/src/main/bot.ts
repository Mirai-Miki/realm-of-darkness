/**
 * Unified Discord Bot Entry Point
 *
 * This unified bot handles commands and interactions for all game systems:
 * - Chronicles of Darkness (CoD)
 * - World of Darkness 5th Edition (V5)
 * - World of Darkness 20th Anniversary Edition (V20)
 */
require(`${process.cwd()}/alias`);
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { handleErrorDebug } from "@errors";
import { Client, GatewayIntentBits, Collection, Partials } from "discord.js";

import type { BotType, BotCommand, BotComponent, BotEvent } from "@types";

// Load environment variables
dotenv.config();

// Determine bot type from environment variable or command line argument
const getBotType = (): BotType => {
  // Check environment variable first
  if (process.env.BOT_TYPE) {
    return process.env.BOT_TYPE as BotType;
  }

  // Check command line arguments
  const args = process.argv.slice(2);
  if (args.length > 0 && ["cod", "5th", "20th"].includes(args[0])) {
    return args[0] as BotType;
  }

  throw new Error(
    "Bot type must be specified via BOT_TYPE environment variable or command line argument"
  );
};

// Bot configuration
const BOT_CONFIG = {
  cod: {
    token: process.env.TOKEN_COD!,
    name: "Chronicles of Darkness",
    intents: [GatewayIntentBits.Guilds],
    commandsPath: "commands/cod",
    componentsPath: "components/cod",
    hasComponents: false,
  },
  "5th": {
    token: process.env.TOKEN_5TH!,
    name: "5th Edition",
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ],
    commandsPath: "commands/5th",
    componentsPath: "components/5th",
    hasComponents: true,
  },
  "20th": {
    token: process.env.TOKEN_20TH!,
    name: "20th Anniversary Edition",
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ],
    commandsPath: "commands/20th",
    componentsPath: "components/20th",
    hasComponents: true,
  },
} as const;

// Determine environment and source directory
const runningFromDist = process.env.NODE_ENV !== "development";
const srcDir = runningFromDist ? "dist" : "src";

// Get bot type and configuration
const botType = getBotType();
const config = BOT_CONFIG[botType];

// Initialize Discord client with bot-specific configuration
const client = new Client({
  intents: config.intents,
  partials: [Partials.GuildMember, Partials.User],
});

/* Loading Command Interaction in Client */
client.commands = new Collection<string, BotCommand>();
const commandsPath = path.join(process.cwd(), srcDir, config.commandsPath);

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

  for (const file of commandFiles) {
    try {
      const command = require(`@${config.commandsPath}/${file}`);
      if (command.data && command.data.name) {
        client.commands.set(command.data.name, command);
      } else {
        console.warn(`Command ${file} is missing required properties`);
      }
    } catch (error) {
      console.error(`Failed to load command ${file}:`, error);
    }
  }
} else {
  console.error(`Commands directory not found: ${commandsPath}`);
  process.exit(1);
}

/* Loading Component Interactions in Client (for bots that support them) */
client.components = new Collection<string, BotComponent>();

if (config.hasComponents) {
  const componentsPath = path.join(
    process.cwd(),
    srcDir,
    config.componentsPath
  );

  if (fs.existsSync(componentsPath)) {
    const componentFiles = fs
      .readdirSync(componentsPath)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

    for (const file of componentFiles) {
      try {
        const component = require(`@${config.componentsPath}/${file}`);
        if (component.name) {
          client.components.set(component.name, component);
        } else {
          console.warn(`Component ${file} is missing a name property`);
        }
      } catch (error) {
        console.error(`Failed to load component ${file}:`, error);
      }
    }
  } else {
    console.warn(`Components directory not found: ${componentsPath}`);
  }
}

/* Event Listeners */
const eventsPath = path.join(process.cwd(), srcDir, "events");

if (fs.existsSync(eventsPath)) {
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

  for (const file of eventFiles) {
    try {
      const event: BotEvent = require(`@events/${file}`);
      if (event.name) {
        // Type assertion for the Event
        event as BotEvent<typeof event.name>;
        if (event.once) {
          client.once(
            event.name,
            async (...args: Parameters<typeof event.execute>) => {
              try {
                await event.execute(...args);
              } catch (error) {
                await handleErrorDebug(error, client);
              }
            }
          );
        } else {
          client.on(
            event.name,
            async (...args: Parameters<typeof event.execute>) => {
              try {
                await event.execute(...args);
              } catch (error) {
                await handleErrorDebug(error, client);
              }
            }
          );
        }
      } else {
        console.warn(`Event ${file} is missing a name property`);
      }
    } catch (error) {
      console.error(`Failed to load event ${file}:`, error);
    }
  }
} else {
  console.error(`Events directory not found: ${eventsPath}`);
  process.exit(1);
}

// Log in to Discord using bot-specific token
client.login(config.token).catch((error) => {
  console.error(`Failed to log in ${config.name} to Discord:`, error);
  process.exit(1);
});
