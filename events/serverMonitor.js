const {
  checkWebsiteStatus,
  checkGameServerStatus,
  getPing,
  updateInstatusComponent,
} = require("../src/monitor");
const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const configPath = path.resolve(__dirname, "../config.json");

module.exports = async (client) => {
  const channel = await client.channels.fetch(client.config.channelId);
  if (!channel) {
    console.log("Channel not found");
    return;
  }

  // Create or fetch main and detail messages
  if (!client.config.messageIDs.main) {
    await createMainMessage(channel, client.config.data.main);
  }
  if (!client.config.messageIDs.detail) {
    await createDetailMessage(channel);
  }

  updateServerStatuses();

  // setInterval(updateServerStatuses, 60000);
  // Schedule the task to run every minute
  cron.schedule("* * * * *", updateServerStatuses);

  async function createMainMessage(channel, serverConfig) {
    const mainEmbed = new EmbedBuilder()
      .setTitle("HomeLab: Main Server Status")
      .setColor(0xff5733)
      .addFields(
        { name: "Hostname", value: "Initializing...", inline: true },
        { name: "Status", value: "Initializing...", inline: true },
        { name: "VMs", value: "Loading..." },
        { name: "Status", value: "Loading...", inline: true },
        { name: "LXCs", value: "Loading..." },
        { name: "Status", value: "Loading...", inline: true }
      )
      .setFooter({ text: "Last update" })
      .setTimestamp();

    const mainMessage = await channel.send({ embeds: [mainEmbed] });
    client.config.messageIDs.main = mainMessage.id;
    saveConfig();
  }

  async function createDetailMessage(channel) {
    const detailEmbed = new EmbedBuilder()
      .setTitle("HomeLab Components & Service Status")
      .setColor(0xffc107)
      .setFooter({ text: "Last update" })
      .setTimestamp();

    const detailMessage = await channel.send({ embeds: [detailEmbed] });
    client.config.messageIDs.detail = detailMessage.id;
    saveConfig();
  }

  async function updateServerStatuses() {
    const channel = await client.channels.fetch(client.config.channelId);
    const mainFields = [];
    const detailFields = [];

    let allOnline = true;
    let offlineCount = 0;

    for (const [serverKey, serverConfig] of Object.entries(
      client.config.data
    )) {
      let statusData;
      if (serverConfig.type === "website") {
        statusData = await checkWebsiteStatus(serverConfig.server);
      } else if (serverConfig.type === "port") {
        statusData = await checkGameServerStatus(
          serverConfig.server,
          serverConfig.port
        );
      }

      const status =
        statusData.status === 200
          ? "Online"
          : statusData.statusDescription || "Offline";
      const icon = statusData.status === 200 ? ":white_check_mark:" : ":x:";
      const hostname = serverConfig.hostname;
      const ip =
        statusData.status === 200 && serverConfig.type !== "website"
          ? `${serverConfig.server}:${serverConfig.port}`
          : "None";

      if (serverKey === "main") {
        mainFields.push(
          { name: "Hostname", value: hostname, inline: true },
          { name: "Status", value: `${icon} ${status}`, inline: true }
        );

        // Fetch VMs and LXCs statuses
        const vms = await fetchVMsStatus();
        const lxcs = await fetchLXCsStatus();

        mainFields.push(
          { name: "\u200B", value: "\u200B", inline: true },
          { name: "VMs", value: vms.names.join("\n"), inline: true },
          { name: "Status", value: vms.statuses.join("\n"), inline: true },
          { name: "\u200B", value: "\u200B", inline: true },
          { name: "LXCs", value: lxcs.names.join("\n"), inline: true },
          { name: "Status", value: lxcs.statuses.join("\n"), inline: true },
          { name: "\u200B", value: "\u200B", inline: true }
        );
      } else {
        const ping = await getPing(
          serverConfig.server,
          serverConfig.type,
          serverConfig.port
        );
        const statusText = `${icon} ${status} (~${ping} ms)`;
        // serverConfig.type === "website"
        //   ? `${icon} ${status} (~${ping} ms)`
        //   : `${icon} ${status} (IP: ${ip}) (~${ping} ms)`;
        detailFields.push({ name: serverConfig.hostname, value: statusText });

        // Update Instatus component status
        if (serverConfig.component_id) {
          const newStatus =
            statusData.status === 200
              ? client.config.component_statuses[0]
              : client.config.component_statuses[1];
          await updateInstatusComponent(
            serverConfig.component_id,
            newStatus,
            serverConfig.current_status || "", // Assume `current_status` is tracked in serverConfig
            client.config.instatusApiUrl,
            client.config.instatusApiToken,
            client.config.instatusPageId
          );
          serverConfig.current_status = newStatus; // Update the current status
          saveConfig(); // Save the updated status to the config
        }
      }

      if (statusData.status !== 200) {
        allOnline = false;
        offlineCount++;
      }
    }

    // Determine the color for the main embed
    const mainColor = mainFields[1].value.includes(":white_check_mark:")
      ? 0x21d37d
      : 0xf08080;

    // Determine the color for the detail embed
    let detailColor;
    if (allOnline) {
      detailColor = 0x21d37d; // Green if all online
    } else if (offlineCount === Object.keys(client.config.data).length - 1) {
      detailColor = 0xf08080; // Red if all are offline
    } else {
      detailColor = 0xffb247; // Yellow if more than one is not online
    }

    // Update main embed
    if (client.config.messageIDs.main) {
      const mainMessage = await channel.messages.fetch(
        client.config.messageIDs.main
      );
      const mainEmbed = new EmbedBuilder()
        .setTitle("HomeLab: Main Server Status")
        .setURL("https://status.icutmyhair.space")
        .setColor(mainColor)
        .addFields(mainFields)
        .setFooter({ text: "Last update" })
        .setTimestamp();

      await mainMessage.edit({ embeds: [mainEmbed] });
    }

    // Update detail embed
    if (client.config.messageIDs.detail) {
      const detailMessage = await channel.messages.fetch(
        client.config.messageIDs.detail
      );
      const detailEmbed = new EmbedBuilder()
        .setTitle("HomeLab Components & Service Status")
        .setURL("https://status.icutmyhair.space")
        .setColor(detailColor)
        .addFields(detailFields)
        .setFooter({ text: "Last update" })
        .setTimestamp();

      await detailMessage.edit({ embeds: [detailEmbed] });
    }
  }

  async function fetchVMsStatus() {
    try {
      const response = await axios.get(
        `${client.config.proxmoxApiUrl}/api2/json/nodes/proxmox/qemu`,
        {
          headers: {
            Authorization: `Bearer ${client.config.proxmoxApiToken}`,
          },
        }
      );
      const vms = response.data.data.sort((a, b) => a.vmid - b.vmid); // Sort by vmid asc
      const names = vms.map((vm) => vm.name);
      const statuses = vms.map(
        (vm) =>
          `${vm.status === "running" ? ":white_check_mark:" : ":x:"} ${
            vm.status
          }`
      );
      return { names, statuses };
    } catch (error) {
      console.error("Failed to fetch VMs status:", error);
      return { names: ["Failed to fetch VMs status"], statuses: [""] };
    }
  }

  async function fetchLXCsStatus() {
    try {
      const response = await axios.get(
        `${client.config.proxmoxApiUrl}/api2/json/nodes/proxmox/lxc`,
        {
          headers: {
            Authorization: `Bearer ${client.config.proxmoxApiToken}`,
          },
        }
      );
      const lxcs = response.data.data.sort((a, b) => a.vmid - b.vmid); // Sort by vmid asc
      const names = lxcs.map((lxc) => lxc.name);
      const statuses = lxcs.map(
        (lxc) =>
          `${lxc.status === "running" ? ":white_check_mark:" : ":x:"} ${
            lxc.status
          }`
      );
      return { names, statuses };
    } catch (error) {
      console.error("Failed to fetch LXCs status:", error);
      return { names: ["Failed to fetch LXCs status"], statuses: [""] };
    }
  }

  function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(client.config, null, 2));
  }
};
