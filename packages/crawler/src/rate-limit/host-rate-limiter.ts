export type DelayFunction = (ms: number) => Promise<void>;
export type NowFunction = () => number;

export class HostRateLimiter {
  private readonly lastRequestAtByHost = new Map<string, number>();
  private readonly delay: DelayFunction;
  private readonly now: NowFunction;
  private readonly minDelayMs: number;

  constructor(options: {
    delay: DelayFunction;
    now?: NowFunction;
    minDelayMs: number;
  }) {
    this.delay = options.delay;
    this.now = options.now ?? Date.now;
    this.minDelayMs = options.minDelayMs;
  }

  async waitForTurn(urlValue: string): Promise<void> {
    const host = new URL(urlValue).hostname;
    const lastRequestAt = this.lastRequestAtByHost.get(host);
    const nowMs = this.now();

    if (lastRequestAt !== undefined) {
      const elapsedMs = nowMs - lastRequestAt;
      const waitMs = Math.max(this.minDelayMs - elapsedMs, 0);
      if (waitMs > 0) {
        await this.delay(waitMs);
      }
    }

    this.lastRequestAtByHost.set(host, this.now());
  }
}
