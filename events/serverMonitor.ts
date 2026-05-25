import fs from "fs";
import cron from "node-cron";
import type { TextChannel } from "discord.js";
import {
  buildDetailEmbed,
  buildInitialDetailEmbed,
  buildInitialMainEmbed,
  buildMainEmbed,
} from "../src/embeds";
import {
  getMikroTikInterfaceStatus,
  isMikroTikMonitorConfigured,
  notifyMikroTikChanges,
  toMikroTikRuntimeState,
} from "../src/mikrotikMonitor";
import { buildStatusSnapshot } from "../src/statusService";
import type { BotClient } from "../src/types";

export default async function serverMonitor(client: BotClient): Promise<void> {
  const channel = await client.channels.fetch(client.config.channelId);
  if (!channel || !("send" in channel) || !("messages" in channel)) {
    console.log("Channel not found or is not text-based");
    return;
  }
  const textChannel = channel as TextChannel;

  let isUpdating = false;

  if (!client.config.messageIDs.main) {
    await createMainMessage(textChannel);
  }

  if (!client.config.messageIDs.detail) {
    await createDetailMessage(textChannel);
  }

  await updateServerStatuses();
  cron.schedule("* * * * *", updateServerStatuses);
  startMikroTikMonitor();

  async function createMainMessage(channel: TextChannel): Promise<void> {
    const mainMessage = await channel.send({ embeds: [buildInitialMainEmbed()] });
    client.config.messageIDs.main = mainMessage.id;
    saveRuntimeConfig();
  }

  async function createDetailMessage(channel: TextChannel): Promise<void> {
    const detailMessage = await channel.send({
      embeds: [buildInitialDetailEmbed()],
    });
    client.config.messageIDs.detail = detailMessage.id;
    saveRuntimeConfig();
  }

  async function updateServerStatuses(): Promise<void> {
    if (isUpdating) {
      console.log("Skipping status update because the previous run is still active");
      return;
    }

    isUpdating = true;

    try {
      const snapshot = await buildStatusSnapshot(client.config);

      if (client.config.messageIDs.main) {
        const mainMessage = await textChannel.messages.fetch(
          client.config.messageIDs.main
        );
        await mainMessage.edit({ embeds: [buildMainEmbed(snapshot)] });
      }

      if (client.config.messageIDs.detail) {
        const detailMessage = await textChannel.messages.fetch(
          client.config.messageIDs.detail
        );
        await detailMessage.edit({ embeds: [buildDetailEmbed(snapshot)] });
      }
    } catch (error) {
      console.error("Failed to update server statuses:", error);
    } finally {
      isUpdating = false;
    }
  }

  function startMikroTikMonitor(): void {
    if (!isMikroTikMonitorConfigured(client.config.mikrotik)) {
      console.log("Skipping MikroTik monitor because SSH config is incomplete");
      return;
    }

    let isPolling = false;
    const pollIntervalMs = client.config.mikrotik.pollSeconds * 1000;

    void pollMikroTik();
    setInterval(() => {
      void pollMikroTik();
    }, pollIntervalMs);

    async function pollMikroTik(): Promise<void> {
      if (isPolling) {
        console.log("Skipping MikroTik poll because the previous run is still active");
        return;
      }

      isPolling = true;

      try {
        const notifyChannel = await client.channels.fetch(
          client.config.mikrotik.notifyChannelId
        );
        if (!notifyChannel || !("send" in notifyChannel)) {
          console.log("Skipping MikroTik alert because notify channel is invalid");
          return;
        }

        const status = await getMikroTikInterfaceStatus(client.config.mikrotik);
        const previous = client.runtimeConfig.mikrotikState;

        await notifyMikroTikChanges(
          notifyChannel as TextChannel,
          client.config.mikrotik,
          previous,
          status
        );

        client.runtimeConfig.mikrotikState = toMikroTikRuntimeState(status);
        saveRuntimeConfig();
      } catch (error) {
        console.error("Failed to poll MikroTik interface:", error);
      } finally {
        isPolling = false;
      }
    }
  }

  function saveRuntimeConfig(): void {
    client.runtimeConfig.messageIDs = client.config.messageIDs;
    fs.writeFileSync(
      client.runtimeConfigPath,
      JSON.stringify(client.runtimeConfig, null, 2)
    );
  }
}
