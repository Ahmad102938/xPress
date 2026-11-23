"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * The user's delivery / search location (owner decision 2026-11-23, Apollo-style).
 * - Default: Bhopal 462001 until the user shares a location or picks a pincode.
 * - First visit: the browser's location prompt appears on load (unless already blocked).
 * - Kept on this device only (localStorage). Never sent to our database or analytics.
 */

export interface SavedLocation {
  city: string | null;
  pincode: string | null;
  source: "default" | "gps" | "pincode";
}

export type DetectResult = "ok" | "denied" | "unsupported" | "outside" | "unavailable";

export const DEFAULT_LOCATION: SavedLocation = {
  city: "Bhopal",
  pincode: "462001",
  source: "default",
};
const STORAGE_KEY = "acx_location";

interface LocationContextValue {
  location: SavedLocation;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Asks the browser for the current position and resolves it to a city and pincode. */
  detect: () => Promise<DetectResult>;
  /** Looks up a pincode and saves it; returns false when it is unknown. */
  choosePincode: (pincode: string) => Promise<"ok" | "not_found" | "unavailable">;
}

const LocationContext = createContext<LocationContextValue | null>(null);

function read(): SavedLocation | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SavedLocation>;
    if (value.source !== "gps" && value.source !== "pincode") return null;
    return { city: value.city ?? null, pincode: value.pincode ?? null, source: value.source };
  } catch {
    return null;
  }
}

function write(location: SavedLocation) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
}

// Device store (localStorage) read through useSyncExternalStore: the server and the first client
// render use the default, then the saved choice, with no hydration mismatch.
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: SavedLocation = DEFAULT_LOCATION;

function rawStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Stable snapshot: re-parses only when the stored text changes (also after another tab saves). */
function getSnapshot(): SavedLocation {
  const raw = rawStored();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = read() ?? DEFAULT_LOCATION;
  }
  return cachedValue;
}

function getServerSnapshot(): SavedLocation {
  return DEFAULT_LOCATION;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function store(next: SavedLocation) {
  write(next);
  for (const listener of listeners) listener();
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 600000,
    }),
  );
}

async function permissionState(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

async function resolvePosition(
  position: GeolocationPosition,
): Promise<SavedLocation | "outside" | "unavailable"> {
  try {
    const { latitude, longitude } = position.coords;
    const response = await fetch(`/api/geo/reverse?lat=${latitude}&lon=${longitude}`);
    if (response.status === 404) return "outside";
    if (!response.ok) return "unavailable";
    const place = (await response.json()) as { city: string | null; pincode: string | null };
    return { city: place.city, pincode: place.pincode, source: "gps" };
  } catch {
    return "unavailable";
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const location = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const save = useCallback((next: SavedLocation) => store(next), []);

  const detect = useCallback(async (): Promise<DetectResult> => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return "unsupported";
    let position: GeolocationPosition;
    try {
      position = await currentPosition();
    } catch (error) {
      return (error as GeolocationPositionError).code === 1 ? "denied" : "unavailable";
    }
    const resolved = await resolvePosition(position);
    if (typeof resolved === "string") return resolved;
    save(resolved);
    return "ok";
  }, [save]);

  const choosePincode = useCallback(
    async (pincode: string) => {
      try {
        const response = await fetch(`/api/geo/pincode?pin=${encodeURIComponent(pincode)}`);
        if (response.status === 404 || response.status === 400) return "not_found" as const;
        if (!response.ok) return "unavailable" as const;
        const place = (await response.json()) as { city: string | null };
        save({ city: place.city, pincode, source: "pincode" });
        return "ok" as const;
      } catch {
        return "unavailable" as const;
      }
    },
    [save],
  );

  // First visit (nothing saved): ask for the current location right away (owner decision).
  useEffect(() => {
    if (read()) return;
    let cancelled = false;
    void permissionState().then(async (state) => {
      if (cancelled || state === "denied" || !("geolocation" in navigator)) return;
      try {
        const position = await currentPosition();
        const resolved = await resolvePosition(position);
        if (!cancelled && typeof resolved !== "string") store(resolved);
      } catch {
        // Blocked or unavailable: keep Bhopal 462001; the user can change it from the header.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<LocationContextValue>(
    () => ({
      location,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      detect,
      choosePincode,
    }),
    [location, isOpen, detect, choosePincode],
  );
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const value = useContext(LocationContext);
  if (!value) throw new Error("useLocation must be used inside <LocationProvider>.");
  return value;
}

export function locationLabel(location: SavedLocation): string {
  return [location.city, location.pincode].filter(Boolean).join(" ");
}
