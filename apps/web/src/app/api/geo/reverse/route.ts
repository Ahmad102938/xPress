import { reverseGeocode } from "@/lib/geo";

/** GET /api/geo/reverse?lat=&lon= -> { city, state, pincode }. Coordinates are never logged or stored. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon))
    return Response.json({ error: "invalid" }, { status: 400 });
  try {
    const place = await reverseGeocode(lat, lon);
    if (!place) return Response.json({ error: "outside_service_area" }, { status: 404 });
    return Response.json(place, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
