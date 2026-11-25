/**
 * Idle timer state machine (docs/specs/signed-in-home.md item 29): active -> warning -> expired.
 * Pure and clock-injected so it can be tested without real time. Activity resets it; activity
 * during the warning cancels the warning. Throttled so a scroll storm is one activity.
 */

export type IdlePhase = "active" | "warning" | "expired";

export interface IdleTimerOptions {
  timeoutMs: number;
  warnMs: number;
  now: () => number;
  onWarn: () => void;
  onExpire: () => void;
  /** Activity closer together than this counts once (default 30 s). */
  throttleMs?: number;
}

export interface IdleTimer {
  activity(): void;
  tick(): IdlePhase;
  stop(): void;
  phase(): IdlePhase;
}

export function createIdleTimer(options: IdleTimerOptions): IdleTimer {
  const throttle = options.throttleMs ?? 30_000;
  let last = options.now();
  let lastCounted = -Infinity;
  let phase: IdlePhase = "active";
  let stopped = false;

  return {
    activity() {
      if (stopped || phase === "expired") return;
      const now = options.now();
      // Activity during the warning always counts: the user answered it.
      if (phase !== "warning" && now - lastCounted < throttle) return;
      lastCounted = now;
      last = now;
      phase = "active";
    },
    tick() {
      if (stopped || phase === "expired") return phase;
      const idle = options.now() - last;
      if (idle >= options.timeoutMs) {
        phase = "expired";
        options.onExpire();
      } else if (idle >= options.timeoutMs - options.warnMs && phase === "active") {
        phase = "warning";
        options.onWarn();
      }
      return phase;
    },
    stop() {
      stopped = true;
    },
    phase: () => phase,
  };
}
