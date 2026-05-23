declare module "node-cron" {
  export interface ScheduledTask {
    start(): void;
    stop(): void;
  }

  export function schedule(expression: string, task: () => void): ScheduledTask;

  const cron: {
    schedule: typeof schedule;
  };

  export default cron;
}
