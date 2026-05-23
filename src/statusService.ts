import { checkServiceStatus } from "./monitors";
import { fetchLXCsStatus, fetchVMsStatus } from "./proxmox";
import type { BotConfig, MonitorResult, ProxmoxStatusList, ServiceConfig } from "./types";

const SERVICE_CONCURRENCY = 5;

export interface ServiceStatus {
  key: string;
  service: ServiceConfig;
  statusData: MonitorResult;
  status: string;
  icon: string;
  latencyLabel: string;
}

export interface StatusSnapshot {
  main: ServiceStatus;
  details: ServiceStatus[];
  vms: ProxmoxStatusList;
  lxcs: ProxmoxStatusList;
  allOnline: boolean;
  offlineCount: number;
  detailOfflineCount: number;
}

export async function buildStatusSnapshot(config: BotConfig): Promise<StatusSnapshot> {
  const entries = Object.entries(config.data);
  const mainEntry = entries.find(([key]) => key === "main");

  if (!mainEntry) {
    throw new Error("Service config is missing the required main service");
  }

  const [mainStatus, detailStatuses, [vms, lxcs]] = await Promise.all([
    buildServiceStatus(mainEntry),
    mapWithConcurrency(
      entries.filter(([key]) => key !== "main"),
      SERVICE_CONCURRENCY,
      buildServiceStatus
    ),
    Promise.all([fetchVMsStatus(config), fetchLXCsStatus(config)]),
  ]);

  const allStatuses = [mainStatus, ...detailStatuses];
  const offlineCount = allStatuses.filter(
    (status) => status.statusData.status !== 200
  ).length;
  const detailOfflineCount = detailStatuses.filter(
    (status) => status.statusData.status !== 200
  ).length;

  return {
    main: mainStatus,
    details: detailStatuses,
    vms,
    lxcs,
    allOnline: offlineCount === 0,
    offlineCount,
    detailOfflineCount,
  };
}

async function buildServiceStatus([
  key,
  service,
]: [string, ServiceConfig]): Promise<ServiceStatus> {
  const statusData = await checkServiceStatus(service);
  const online = statusData.status === 200;
  const status = online ? "Online" : statusData.statusDescription || "Offline";
  const icon = online ? ":white_check_mark:" : ":x:";
  const latencyLabel =
    statusData.latencyMs === undefined ? "N/A" : statusData.latencyMs.toFixed(0);

  return {
    key,
    service,
    statusData,
    status,
    icon,
    latencyLabel,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );

  return results;
}
