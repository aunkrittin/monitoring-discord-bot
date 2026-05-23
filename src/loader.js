const { existsSync, readdirSync } = require("fs");
const path = require("path");
const { Collection, Events } = require("discord.js");

client.commands = new Collection();
const CommandsArray = [];

const eventsPath = path.resolve(__dirname, "../events");
const commandsPath = path.resolve(__dirname, "../commands");
const events = readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

console.log(`Loading events...`);
for (const file of events) {
  const eventPath = path.join(eventsPath, file);
  const event = require(eventPath);
  const eventName = file.split(".")[0];
  const discordEventName =
    eventName === "clientReady" ? Events.ClientReady : eventName;

  console.log(`-> [Loaded Event] ${eventName}`);
  if (eventName === "clientReady") {
    client.once(discordEventName, event.bind(null, client));
  } else {
    client.on(discordEventName, event.bind(null, client));
  }
  delete require.cache[require.resolve(eventPath)];
}

console.log(`Loading commands...`);
if (existsSync(commandsPath)) {
  readdirSync(commandsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .forEach((dirs) => {
      const commandDir = path.join(commandsPath, dirs.name);
      const commands = readdirSync(commandDir).filter((files) =>
        files.endsWith(".js")
      );

      for (const file of commands) {
        const commandPath = path.join(commandDir, file);
        const command = require(commandPath);
        if (command.name && command.description) {
          CommandsArray.push(command);
          console.log(`-> [Loaded Command] ${command.name.toLowerCase()}`);
          client.commands.set(command.name.toLowerCase(), command);
          delete require.cache[require.resolve(commandPath)];
        } else console.log(`[Failed Command] ${command.name.toLowerCase()}`);
      }
    });
} else {
  console.log("-> [Skipped Commands] commands directory not found");
}
