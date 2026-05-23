import axios from "axios";
import net from "net";
import ping from "ping";
import type { MonitorResult, ServiceConfig } from "./types";

const REQUEST_TIMEOUT_MS = 5000;
const SOCKET_TIMEOUT_MS = 2000;

export async function checkServiceStatus(
  service: ServiceConfig
): Promise<MonitorResult> {
  if (service.type === "website") {
    const result = await checkWebsiteStatus(service.server);
    const pingMs = await getPing(service.server, service.type);
    return { ...result, latencyMs: pingMs };
  }

  if (service.type === "port") {
    return checkPortStatus(service.server, service.port);
  }

  return {
    status: "unknown",
    statusDescription: "Unsupported monitor type",
  };
}

export async function checkWebsiteStatus(serverUrl: string): Promise<MonitorResult> {
  try {
    const response = await axios.get(serverUrl, {
      timeout: REQUEST_TIMEOUT_MS,
    });
    return {
      status: response.status,
      statusDescription: "Online",
    };
  } catch (error) {
    return {
      status: axios.isAxiosError(error) && error.response
        ? error.response.status
        : "unknown",
      statusDescription: describeHttpError(error),
    };
  }
}

export async function checkPortStatus(
  host: string,
  port: string | number | undefined
): Promise<MonitorResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const start = Date.now();
    let resolved = false;

    const finish = (status: number | string, latencyMs?: number) => {
      if (resolved) {
        return;
      }

      resolved = true;
      socket.destroy();
      resolve({
        status,
        statusDescription: status === 200 ? "Online" : "Offline",
        latencyMs,
      });
    };

    socket.setTimeout(SOCKET_TIMEOUT_MS);
    socket.once("connect", () => finish(200, Date.now() - start));
    socket.once("timeout", () => finish("timeout"));
    socket.once("error", () => finish("error"));
    socket.connect(Number(port), host);
  });
}

export function extractHostname(server: string): string {
  try {
    return new URL(server).hostname;
  } catch {
    return server;
  }
}

async function getPing(
  server: string,
  type: ServiceConfig["type"]
): Promise<number | undefined> {
  try {
    const hostname = extractHostname(server);
    if (type !== "website") {
      return undefined;
    }

    const res = await ping.promise.probe(hostname, {
      timeout: SOCKET_TIMEOUT_MS / 1000,
    });

    return res.time === "unknown" ? undefined : Number(res.time.toFixed(0));
  } catch (error) {
    console.error(`Failed to get ping for ${server}:`, error);
    return undefined;
  }
}

function describeHttpError(error: unknown): string {
  if (!axios.isAxiosError(error) || !error.response) {
    return "Offline";
  }

  switch (error.response.status) {
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 500:
      return "Internal Server Error";
    case 502:
      return "Bad Gateway";
    case 503:
      return "Service Unavailable";
    default:
      return "Offline";
  }
}
