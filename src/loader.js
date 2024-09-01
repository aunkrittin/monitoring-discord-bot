const { readdirSync } = require("fs");
const { Collection } = require("discord.js");

client.commands = new Collection();
const CommandsArray = [];

const events = readdirSync("./events/").filter((file) => file.endsWith(".js"));
console.log(`Loading events...`);
for (const file of events) {
  const event = require(`../events/${file}`);
  const eventName = file.split(".")[0]; // Get the event name
  console.log(`-> [Loaded Event] ${eventName}`);
  if (eventName === "ready") {
    client.once(eventName, event.bind(null, client));
  } else {
    client.on(eventName, event.bind(null, client));
  }
  delete require.cache[require.resolve(`../events/${file}`)];
}

console.log(`Loading commands...`);
readdirSync("./commands/").forEach((dirs) => {
  const commands = readdirSync(`./commands/${dirs}`).filter((files) =>
    files.endsWith(".js")
  );
  for (const file of commands) {
    const command = require(`../commands/${dirs}/${file}`);
    if (command.name && command.description) {
      CommandsArray.push(command);
      console.log(`-> [Loaded Command] ${command.name.toLowerCase()}`);
      client.commands.set(command.name.toLowerCase(), command);
      delete require.cache[require.resolve(`../commands/${dirs}/${file}`)];
    } else console.log(`[Failed Command] ${command.name.toLowerCase()}`);
  }
});
