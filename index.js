const { Client, GatewayIntentBits } = require("discord.js");
const { loadConfig } = require("./src/config");

const { config, runtimeConfig, runtimeConfigPath } = loadConfig();

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
  client.runtimeConfig = runtimeConfig;
  client.runtimeConfigPath = runtimeConfigPath;
  require("./src/loader"); // Ensure the loader is imported
  await client.login(client.config.token);
}

startBot().catch((error) => {
  console.error("An error occurred while starting the bot:", error);
});
