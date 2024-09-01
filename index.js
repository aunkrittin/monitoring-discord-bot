const { Client, GatewayIntentBits } = require("discord.js");
const config = require("./config.json");

async function startBot() {
  global.client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    disableMentions: "everyone",
  });

  client.config = config;
  client.login(client.config.token);

  require("./src/loader"); // Ensure the loader is imported
}

startBot().catch((error) => {
  console.error("An error occurred while starting the bot:", error);
});
