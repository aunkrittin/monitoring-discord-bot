import fs from "fs";
import path from "path";
import type { BotConfig, LoadedConfig, RuntimeConfig, ServiceConfig } from "./types";

interface LegacyConfig {
  token?: string;
  channelId?: string;
  proxmoxApiUrl?: string;
  proxmoxApiToken?: string;
  data?: Record<string, ServiceConfig>;
  messageIDs?: RuntimeConfig["messageIDs"];
}

interface ServicesConfig {
  data?: Record<string, ServiceConfig>;
  messageIDs?: RuntimeConfig["messageIDs"];
}

export function loadConfig(): LoadedConfig {
  loadEnvFile(process.env.ENV_PATH || path.resolve(process.cwd(), ".env"));

  const legacyConfigPath = path.resolve(
    process.env.CONFIG_PATH || path.resolve(process.cwd(), "config.json")
  );
  const legacyConfig = readJsonIfExists<LegacyConfig>(legacyConfigPath);

  const servicesConfigPath = path.resolve(
    process.env.SERVICES_CONFIG_PATH ||
      path.resolve(process.cwd(), "config.services.json")
  );
  const servicesConfig = readJsonIfExists<ServicesConfig>(servicesConfigPath);

  const runtimeConfigPath = path.resolve(
    process.env.RUNTIME_CONFIG_PATH ||
      path.resolve(process.cwd(), "config.runtime.json")
  );
  const runtimeConfig = readJsonIfExists<RuntimeConfig>(runtimeConfigPath);

  const config: BotConfig = {
    token: getConfigValue("DISCORD_TOKEN", legacyConfig.token),
    channelId: getConfigValue("DISCORD_CHANNEL_ID", legacyConfig.channelId),
    proxmoxApiUrl: getConfigValue("PROXMOX_API_URL", legacyConfig.proxmoxApiUrl),
    proxmoxApiToken: getConfigValue(
      "PROXMOX_API_TOKEN",
      legacyConfig.proxmoxApiToken
    ),
    data: servicesConfig.data || legacyConfig.data || {},
    messageIDs:
      runtimeConfig.messageIDs ||
      servicesConfig.messageIDs ||
      legacyConfig.messageIDs ||
      {},
  };

  validateConfig(config);

  return {
    config,
    runtimeConfig: {
      messageIDs: config.messageIDs,
    },
    runtimeConfigPath,
  };
}

function loadEnvFile(envPath: string): void {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = stripQuotes(rawValue);
  }
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readJsonIfExists<T>(filePath: string): Partial<T> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<T>;
}

function getConfigValue(envName: string, fallback?: string): string {
  return process.env[envName] || fallback || "";
}

function validateConfig(config: BotConfig): void {
  const requiredFields: Array<[string, string]> = [
    ["DISCORD_TOKEN", config.token],
    ["DISCORD_CHANNEL_ID", config.channelId],
    ["PROXMOX_API_URL", config.proxmoxApiUrl],
    ["PROXMOX_API_TOKEN", config.proxmoxApiToken],
  ];

  const missingFields = requiredFields
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingFields.length > 0) {
    throw new Error(`Missing required config values: ${missingFields.join(", ")}`);
  }

  validateServices(config.data);
}

function validateServices(services: Record<string, ServiceConfig>): void {
  if (!services.main) {
    throw new Error("Service config is missing the required main service");
  }

  for (const [key, service] of Object.entries(services)) {
    if (!service.hostname) {
      throw new Error(`Service ${key} is missing hostname`);
    }

    if (!service.server) {
      throw new Error(`Service ${key} is missing server`);
    }

    if (service.type !== "website" && service.type !== "port") {
      throw new Error(`Service ${key} has unsupported type: ${service.type}`);
    }

    if (service.type === "port" && !service.port) {
      throw new Error(`Service ${key} is missing port`);
    }
  }
}
