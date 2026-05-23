import { existsSync, readdirSync } from "fs";
import path from "path";
import { Collection, Events } from "discord.js";
import type { BotClient } from "./types";

interface CommandModule {
  name?: string;
  description?: string;
}

type EventHandler = (client: BotClient) => Promise<void> | void;

export function loadHandlers(client: BotClient): void {
  client.commands = new Collection();

  const eventsPath = path.resolve(__dirname, "../events");
  const commandsPath = path.resolve(__dirname, "../commands");
  const events = readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

  console.log("Loading events...");
  for (const file of events) {
    const eventPath = path.join(eventsPath, file);
    const event = loadModule<EventHandler>(eventPath);
    const eventName = path.basename(file, ".js");
    const discordEventName =
      eventName === "clientReady" ? Events.ClientReady : eventName;

    console.log(`-> [Loaded Event] ${eventName}`);
    if (eventName === "clientReady") {
      client.once(discordEventName, event.bind(null, client));
    } else {
      client.on(discordEventName, event.bind(null, client));
    }
  }

  console.log("Loading commands...");
  if (!existsSync(commandsPath)) {
    console.log("-> [Skipped Commands] commands directory not found");
    return;
  }

  readdirSync(commandsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .forEach((directory) => {
      const commandDir = path.join(commandsPath, directory.name);
      const commands = readdirSync(commandDir).filter((file) =>
        file.endsWith(".js")
      );

      for (const file of commands) {
        const commandPath = path.join(commandDir, file);
        const command = loadModule<CommandModule>(commandPath);
        if (command.name && command.description) {
          console.log(`-> [Loaded Command] ${command.name.toLowerCase()}`);
          client.commands.set(command.name.toLowerCase(), command);
        } else {
          console.log(`[Failed Command] ${command.name || file}`);
        }
      }
    });
}

function loadModule<T>(modulePath: string): T {
  const loaded = require(modulePath) as { default?: T } & T;
  return loaded.default || loaded;
}
