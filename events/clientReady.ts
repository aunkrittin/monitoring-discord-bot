import { ActivityType } from "discord.js";
import serverMonitor from "./serverMonitor";
import type { BotClient } from "../src/types";

export default async function clientReady(client: BotClient): Promise<void> {
  console.log(
    `Logged to the client ${client.user?.username}\n-> Ready on ${client.guilds.cache.size} servers for a total of ${client.users.cache.size} users`
  );

  client.user?.setActivity({
    name: "HomeLab Main Server",
    type: ActivityType.Watching,
  });

  await serverMonitor(client);
}
