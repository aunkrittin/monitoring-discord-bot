import { Client, GatewayIntentBits } from "discord.js";
import { loadConfig } from "./src/config";
import { loadHandlers } from "./src/loader";
import type { BotClient } from "./src/types";

const { config, runtimeConfig, runtimeConfigPath } = loadConfig();

async function startBot(): Promise<void> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  }) as BotClient;

  client.config = config;
  client.runtimeConfig = runtimeConfig;
  client.runtimeConfigPath = runtimeConfigPath;

  loadHandlers(client);
  await client.login(client.config.token);
}

startBot().catch((error) => {
  console.error("An error occurred while starting the bot:", error);
});
