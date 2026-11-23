import { vi } from "vitest";

/** jsdom lacks matchMedia and element scrolling; the carousel uses both. */
export function mockMatchMedia(reducedMotion: boolean) {
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    })),
  );
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
}
