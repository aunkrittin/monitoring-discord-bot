import type { Client, Collection } from "discord.js";

export type ServiceType = "website" | "port";

export interface ServiceConfig {
  hostname: string;
  type: ServiceType;
  server: string;
  port?: string | number;
}

export interface RuntimeConfig {
  messageIDs: {
    main?: string;
    detail?: string;
  };
}

export interface BotConfig extends RuntimeConfig {
  token: string;
  channelId: string;
  proxmoxApiUrl: string;
  proxmoxApiToken: string;
  data: Record<string, ServiceConfig>;
}

export interface LoadedConfig {
  config: BotConfig;
  runtimeConfig: RuntimeConfig;
  runtimeConfigPath: string;
}

export interface BotClient extends Client {
  config: BotConfig;
  runtimeConfig: RuntimeConfig;
  runtimeConfigPath: string;
  commands: Collection<string, unknown>;
}

export interface MonitorResult {
  status: number | string;
  statusDescription?: string;
  latencyMs?: number;
}

export interface ProxmoxStatusList {
  names: string[];
  statuses: string[];
}
