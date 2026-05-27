import { Client as SshClient } from "ssh2";
import {
  EmbedBuilder,
  type TextChannel,
} from "discord.js";
import type {
  MikroTikConfig,
  MikroTikInterfaceStatus,
  MikroTikRuntimeState,
} from "./types";

export async function getMikroTikInterfaceStatus(
  config: MikroTikConfig
): Promise<MikroTikInterfaceStatus> {
  const [detailOutput, monitorOutput] = await Promise.all([
    runSshCommand(
      config,
      `/interface print detail without-paging where name=${config.interfaceName}`
    ),
    runSshCommand(
      config,
      `/interface ethernet monitor ${config.interfaceName} once`
    ),
  ]);
  const values = {
    ...parseMikroTikOutput(detailOutput),
    ...parseMikroTikOutput(monitorOutput),
  };

  return {
    interfaceName: config.interfaceName,
    label: values.comment || "WiFi",
    status: parseLinkStatus(values.status || values["link-ok"]),
    linkDowns: parseOptionalNumber(values["link-downs"]),
    lastLinkDownTime: values["last-link-down-time"],
    lastLinkUpTime: values["last-link-up-time"],
    checkedAt: new Date().toISOString(),
  };
}

export async function notifyMikroTikChanges(
  channel: TextChannel,
  config: MikroTikConfig,
  previous: MikroTikRuntimeState | undefined,
  current: MikroTikInterfaceStatus
): Promise<boolean> {
  if (!previous?.status && previous?.linkDowns === undefined) {
    return false;
  }

  const changes: string[] = [];
  if (previous.status && current.status && previous.status !== current.status) {
    changes.push(current.status === "down" ? "interface down" : "interface up");
  }

  if (
    previous.linkDowns !== undefined &&
    current.linkDowns !== undefined &&
    current.linkDowns > previous.linkDowns
  ) {
    changes.push(`link-downs increased ${previous.linkDowns} -> ${current.linkDowns}`);
  }

  if (changes.length === 0) {
    return false;
  }

  const mention = config.mentionUserId ? `<@${config.mentionUserId}> ` : "";
  await channel.send({
    content: `${mention}MikroTik Wi-Fi uplink alert: ${changes.join(", ")}`,
    embeds: [buildMikroTikEmbed(current, changes)],
  });

  return true;
}

export function toMikroTikRuntimeState(
  status: MikroTikInterfaceStatus
): MikroTikRuntimeState {
  return {
    status: status.status,
    linkDowns: status.linkDowns,
    lastLinkDownTime: status.lastLinkDownTime,
    lastLinkUpTime: status.lastLinkUpTime,
  };
}

export function isMikroTikMonitorConfigured(config: MikroTikConfig): boolean {
  return Boolean(
    config.host &&
      config.username &&
      config.password &&
      /^[\w./-]+$/.test(config.interfaceName)
  );
}

function runSshCommand(config: MikroTikConfig, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new SshClient();
    let settled = false;

    const finish = (error?: Error, output?: string): void => {
      if (settled) {
        return;
      }

      settled = true;
      client.end();

      if (error) {
        reject(error);
        return;
      }

      resolve(output || "");
    };

    client
      .on("ready", () => {
        client.exec(command, (error, stream) => {
          if (error) {
            finish(error);
            return;
          }

          let stdout = "";
          let stderr = "";

          stream.on("close", (code: number) => {
            if (code !== 0) {
              finish(new Error(`MikroTik SSH command failed: ${stderr.trim()}`));
              return;
            }

            finish(undefined, stdout);
          });
          stream.on("data", (data: Buffer) => {
            stdout += data.toString("utf8");
          });
          stream.stderr.on("data", (data: Buffer) => {
            stderr += data.toString("utf8");
          });
        });
      })
      .on("error", finish)
      .connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        readyTimeout: 15_000,
      });
  });
}

function parseMikroTikOutput(output: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of output.split(/\r?\n/)) {
    const commentIndex = line.indexOf(";;;");
    if (commentIndex !== -1 && !values.comment) {
      values.comment = line.slice(commentIndex + 3).trim();
    }

    const colonMatch = line.match(/^\s*([^:]+):\s*(.*?)\s*$/);
    if (colonMatch) {
      values[colonMatch[1].trim()] = colonMatch[2].trim();
      continue;
    }

    const matches = [...line.matchAll(/([\w-]+)=/g)];
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const nextMatch = matches[index + 1];
      const key = match[1];
      const valueStart = (match.index || 0) + match[0].length;
      const valueEnd = nextMatch?.index ?? line.length;
      values[key] = line.slice(valueStart, valueEnd).trim().replace(/^"|"$/g, "");
    }
  }

  return values;
}

function parseLinkStatus(value?: string): "up" | "down" | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (normalized === "link-ok" || normalized === "yes" || normalized === "up") {
    return "up";
  }

  if (normalized === "no-link" || normalized === "no" || normalized === "down") {
    return "down";
  }

  return undefined;
}

function parseOptionalNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildMikroTikEmbed(
  status: MikroTikInterfaceStatus,
  changes: string[]
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("MikroTik Wi-Fi Uplink")
    .setColor(status.status === "down" ? 0xff4d4f : 0x22c55e)
    .addFields(
      { name: "Event", value: changes.join("\n") || "state changed" },
      { name: "Interface", value: status.interfaceName, inline: true },
      { name: "Label/comment", value: status.label || "WiFi", inline: true },
      { name: "Status", value: status.status || "unknown", inline: true },
      {
        name: "Link-down count",
        value: String(status.linkDowns ?? "unknown"),
        inline: true,
      },
      {
        name: "Last link down time",
        value: status.lastLinkDownTime || "unknown",
        inline: true,
      },
      {
        name: "Last link up time",
        value: status.lastLinkUpTime || "unknown",
        inline: true,
      },
      { name: "Current check time", value: formatDisplayTime(status.checkedAt) },
      {
        name: "Hint",
        value: "If this repeats, check cable, ISP2 LAN port, or ISP2 power.",
      }
    );
}

function formatDisplayTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
    timeZoneName: "short",
  }).format(date);
}
