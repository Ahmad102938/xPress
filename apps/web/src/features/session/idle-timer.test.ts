import { describe, expect, it, vi } from "vitest";
import { createIdleTimer } from "./idle-timer";

const MIN = 60_000;

function setup(timeoutMin = 30, warnMs = 2 * MIN) {
  let now = 0;
  const onWarn = vi.fn();
  const onExpire = vi.fn();
  const timer = createIdleTimer({
    timeoutMs: timeoutMin * MIN,
    warnMs,
    now: () => now,
    onWarn,
    onExpire,
  });
  return { timer, onWarn, onExpire, advance: (ms: number) => (now += ms) };
}

describe("createIdleTimer", () => {
  it("warns at 28 minutes and expires at 30", () => {
    const { timer, onWarn, onExpire, advance } = setup();
    advance(28 * MIN - 1);
    expect(timer.tick()).toBe("active");
    advance(1);
    expect(timer.tick()).toBe("warning");
    expect(onWarn).toHaveBeenCalledOnce();
    advance(2 * MIN);
    expect(timer.tick()).toBe("expired");
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it("warns a quarter early for a 4-minute timeout", () => {
    const { timer, advance } = setup(4, MIN);
    advance(3 * MIN);
    expect(timer.tick()).toBe("warning");
  });

  it("resets on activity", () => {
    const { timer, onWarn, advance } = setup();
    advance(20 * MIN);
    timer.activity();
    advance(20 * MIN);
    expect(timer.tick()).toBe("active");
    expect(onWarn).not.toHaveBeenCalled();
  });

  it("cancels the warning on activity during it, even inside the throttle window", () => {
    const { timer, onExpire, advance } = setup();
    advance(28 * MIN);
    timer.activity(); // counted (first activity)
    advance(28 * MIN);
    expect(timer.tick()).toBe("warning");
    advance(1000);
    timer.activity(); // within 30 s of nothing else, but answers the warning
    expect(timer.phase()).toBe("active");
    advance(2 * MIN);
    expect(timer.tick()).toBe("active");
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("throttles bursts of activity", () => {
    const { timer, advance } = setup();
    timer.activity();
    advance(10_000);
    timer.activity(); // ignored: inside 30 s of the last counted one
    advance(28 * MIN - 10_000);
    expect(timer.tick()).toBe("warning");
  });

  it("does nothing after stop or expiry", () => {
    const { timer, onExpire, advance } = setup();
    timer.stop();
    advance(60 * MIN);
    expect(timer.tick()).toBe("active");
    expect(onExpire).not.toHaveBeenCalled();
  });
});
