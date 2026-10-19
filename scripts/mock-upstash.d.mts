export interface MockUpstash {
  /** e.g. http://127.0.0.1:41234 — start-redis is at `${base}/start-redis`. */
  base: string;
  /** How many distinct databases have been handed out. */
  provisioned(): number;
  stop(): Promise<void>;
}

export function startMockUpstash(options?: { port?: number }): Promise<MockUpstash>;
