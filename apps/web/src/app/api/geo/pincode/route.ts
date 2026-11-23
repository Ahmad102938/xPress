import { lookupPincode, PINCODE } from "@/lib/geo";

/** GET /api/geo/pincode?pin=462001 -> { city, state, pincode } (cached for a day; no logging). */
export async function GET(request: Request) {
  const pin = new URL(request.url).searchParams.get("pin") ?? "";
  if (!PINCODE.test(pin)) return Response.json({ error: "invalid_pincode" }, { status: 400 });
  try {
    const place = await lookupPincode(pin);
    if (!place) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json(place, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
