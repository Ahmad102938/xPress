/**
 * Location lookups behind one adapter (server only), so the provider can be swapped for Google
 * Maps, Mappls or Ola Maps later (Product Context D9). Current providers (owner decision,
 * 2026-11-23; to be added to the D4 processor register):
 *  - India Post pincode API: pincode -> city/state.
 *  - OpenStreetMap Nominatim: coordinates -> city + pincode (low volume only, per its usage policy).
 * Privacy: coordinates are rounded to ~110 m before leaving our server, nothing is logged, and no
 * user identifier is ever sent. Location is not health data.
 */

export interface Place {
  city: string | null;
  state: string | null;
  pincode: string | null;
}

export const PINCODE = /^[1-9]\d{5}$/;

const USER_AGENT = "A-CureXpress/0.1 (development; location lookup)";
const TIMEOUT_MS = 5000;

/** India roughly: keeps lookups to the service area and refuses junk input. */
export function isInIndia(lat: number, lon: number): boolean {
  return lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98;
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** India Post: [{ Status: "Success", PostOffice: [{ District, State, Block, Name }] }] */
export function parseIndiaPost(json: unknown, pincode: string): Place | null {
  const first = Array.isArray(json) ? (json[0] as Record<string, unknown> | undefined) : undefined;
  if (!first || first.Status !== "Success" || !Array.isArray(first.PostOffice)) return null;
  const office = first.PostOffice[0] as Record<string, unknown> | undefined;
  if (!office) return null;
  return { city: text(office.District) ?? text(office.Block), state: text(office.State), pincode };
}

/** Nominatim jsonv2 reverse: { address: { city|town|village|state_district, postcode, state, country_code } } */
export function parseNominatim(json: unknown): Place | null {
  const address = (json as { address?: Record<string, unknown> } | null)?.address;
  if (!address || address.country_code !== "in") return null;
  const postcode = text(address.postcode)?.replace(/\s/g, "") ?? null;
  return {
    city:
      text(address.city) ??
      text(address.town) ??
      text(address.state_district) ??
      text(address.county) ??
      text(address.village),
    state: text(address.state),
    pincode: postcode && PINCODE.test(postcode) ? postcode : null,
  };
}

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const response = await fetchImpl(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`lookup failed (${response.status})`);
  return response.json();
}

export async function lookupPincode(
  pincode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Place | null> {
  if (!PINCODE.test(pincode)) return null;
  return parseIndiaPost(
    await getJson(`https://api.postalpincode.in/pincode/${pincode}`, fetchImpl),
    pincode,
  );
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = fetch,
): Promise<Place | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isInIndia(lat, lon)) return null;
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(roundCoordinate(lat)));
  url.searchParams.set("lon", String(roundCoordinate(lon)));
  url.searchParams.set("zoom", "16");
  url.searchParams.set("addressdetails", "1");
  return parseNominatim(await getJson(url.toString(), fetchImpl));
}
