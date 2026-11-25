/**
 * Recent searches on THIS device only (docs/specs/signed-in-home.md item 57): the last 5, under an
 * `acx:` key so sign-out and idle sign-out clear them. Never sent to the server or to analytics.
 * Recorded only while signed in (the search bar checks). A store for useSyncExternalStore.
 */

export const RECENT_SEARCHES_KEY = "acx:recent-searches";
const MAX = 5;
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: readonly string[] } = { raw: null, value: [] };

function read(): string | null {
  try {
    return localStorage.getItem(RECENT_SEARCHES_KEY);
  } catch {
    return null;
  }
}

export function readRecentSearches(): readonly string[] {
  const raw = read();
  if (raw === cache.raw) return cache.value;
  let value: readonly string[] = [];
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX)
      : [];
  } catch {
    value = [];
  }
  cache = { raw, value };
  return value;
}

function write(list: readonly string[]) {
  try {
    if (list.length) localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
    else localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Storage blocked: nothing is remembered.
  }
  for (const listener of listeners) listener();
}

export function addRecentSearch(query: string) {
  const trimmed = query.trim().replace(/\s+/g, " ").slice(0, 80);
  if (trimmed.length < 2) return;
  const rest = readRecentSearches().filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  write([trimmed, ...rest].slice(0, MAX));
}

export function clearRecentSearches() {
  write([]);
}

export function subscribeRecentSearches(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === RECENT_SEARCHES_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
