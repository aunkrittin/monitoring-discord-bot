const fs = require("fs");
const path = require("path");

function loadConfig() {
  loadEnvFile(process.env.ENV_PATH || path.join(__dirname, "../.env"));

  const legacyConfigPath = path.resolve(
    process.env.CONFIG_PATH || path.join(__dirname, "../config.json")
  );
  const legacyConfig = readJsonIfExists(legacyConfigPath);

  const servicesConfigPath = path.resolve(
    process.env.SERVICES_CONFIG_PATH ||
      path.join(__dirname, "../config.services.json")
  );
  const servicesConfig = readJsonIfExists(servicesConfigPath) || {};
  const runtimeConfigPath = path.resolve(
    process.env.RUNTIME_CONFIG_PATH ||
      path.join(__dirname, "../config.runtime.json")
  );
  const runtimeConfig = readJsonIfExists(runtimeConfigPath) || {};

  const config = {
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

function loadEnvFile(envPath) {
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

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getConfigValue(envName, fallback) {
  return process.env[envName] || fallback;
}

function validateConfig(config) {
  const requiredFields = [
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
}

module.exports = {
  loadConfig,
};
