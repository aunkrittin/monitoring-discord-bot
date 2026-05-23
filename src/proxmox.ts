import axios from "axios";
import type { BotConfig, ProxmoxStatusList } from "./types";

const REQUEST_TIMEOUT_MS = 5000;

interface ProxmoxResource {
  name: string;
  status: string;
  vmid: number;
}

interface ProxmoxResponse {
  data: ProxmoxResource[];
}

export async function fetchVMsStatus(config: BotConfig): Promise<ProxmoxStatusList> {
  return fetchProxmoxStatus(
    `${config.proxmoxApiUrl}/api2/json/nodes/proxmox/qemu`,
    config.proxmoxApiToken,
    "VMs"
  );
}

export async function fetchLXCsStatus(config: BotConfig): Promise<ProxmoxStatusList> {
  return fetchProxmoxStatus(
    `${config.proxmoxApiUrl}/api2/json/nodes/proxmox/lxc`,
    config.proxmoxApiToken,
    "LXCs"
  );
}

async function fetchProxmoxStatus(
  url: string,
  token: string,
  label: string
): Promise<ProxmoxStatusList> {
  try {
    const response = await axios.get<ProxmoxResponse>(url, {
      headers: {
        Authorization: `PVEAPIToken=${token}`,
      },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const resources = response.data.data.sort((a, b) => a.vmid - b.vmid);
    return {
      names: resources.map((resource) => resource.name),
      statuses: resources.map(
        (resource) =>
          `${resource.status === "running" ? ":white_check_mark:" : ":x:"} ${
            resource.status
          }`
      ),
    };
  } catch (error) {
    console.error(`Failed to fetch ${label} status:`, error);
    return { names: [`Failed to fetch ${label} status`], statuses: [""] };
  }
}
