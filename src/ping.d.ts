declare module "ping" {
  export interface ProbeResult {
    time: number | "unknown";
  }

  export const promise: {
    probe(host: string, options?: { timeout?: number }): Promise<ProbeResult>;
  };
}
