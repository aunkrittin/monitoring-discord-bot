import { EmbedBuilder } from "discord.js";
import type { StatusSnapshot } from "./statusService";

const STATUS_URL = "https://status.icutmyhair.space";

export function buildInitialMainEmbed(): EmbedBuilder {
  return new EmbedBuilder()
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
}

export function buildInitialDetailEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("HomeLab Components & Service Status")
    .setColor(0xffc107)
    .setFooter({ text: "Last update" })
    .setTimestamp();
}

export function buildMainEmbed(snapshot: StatusSnapshot): EmbedBuilder {
  const mainColor = snapshot.main.statusData.status === 200 ? 0x21d37d : 0xf08080;

  return new EmbedBuilder()
    .setTitle("HomeLab: Main Server Status")
    .setURL(STATUS_URL)
    .setColor(mainColor)
    .addFields(
      {
        name: "Hostname",
        value: snapshot.main.service.hostname,
        inline: true,
      },
      {
        name: "Status",
        value: `${snapshot.main.icon} ${snapshot.main.status}`,
        inline: true,
      },
      { name: "\u200B", value: "\u200B", inline: true },
      { name: "VMs", value: snapshot.vms.names.join("\n"), inline: true },
      { name: "Status", value: snapshot.vms.statuses.join("\n"), inline: true },
      { name: "\u200B", value: "\u200B", inline: true },
      { name: "LXCs", value: snapshot.lxcs.names.join("\n"), inline: true },
      { name: "Status", value: snapshot.lxcs.statuses.join("\n"), inline: true },
      { name: "\u200B", value: "\u200B", inline: true }
    )
    .setFooter({ text: "Last update" })
    .setTimestamp();
}

export function buildDetailEmbed(snapshot: StatusSnapshot): EmbedBuilder {
  let detailColor = 0xffb247;
  if (snapshot.allOnline) {
    detailColor = 0x21d37d;
  } else if (snapshot.detailOfflineCount === snapshot.details.length) {
    detailColor = 0xf08080;
  }

  return new EmbedBuilder()
    .setTitle("HomeLab Components & Service Status")
    .setURL(STATUS_URL)
    .setColor(detailColor)
    .addFields(
      snapshot.details.map((detail) => ({
        name: detail.service.hostname,
        value: `${detail.icon} ${detail.status} (~${detail.latencyLabel} ms)`,
      }))
    )
    .setFooter({ text: "Last update" })
    .setTimestamp();
}
