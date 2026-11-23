// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  isInIndia,
  lookupPincode,
  parseIndiaPost,
  parseNominatim,
  reverseGeocode,
  roundCoordinate,
} from "./geo";

describe("parseIndiaPost", () => {
  it("reads the district and state of the first post office", () => {
    const json = [
      {
        Status: "Success",
        PostOffice: [{ Name: "Bhopal GPO", District: "Bhopal", State: "Madhya Pradesh" }],
      },
    ];
    expect(parseIndiaPost(json, "462001")).toEqual({
      city: "Bhopal",
      state: "Madhya Pradesh",
      pincode: "462001",
    });
  });

  it("returns null for an unknown pincode", () => {
    expect(parseIndiaPost([{ Status: "Error", PostOffice: null }], "999999")).toBeNull();
    expect(parseIndiaPost({}, "462001")).toBeNull();
  });
});

describe("parseNominatim", () => {
  it("reads city and pincode for India", () => {
    const json = {
      address: { city: "Bhopal", postcode: "462 001", state: "Madhya Pradesh", country_code: "in" },
    };
    expect(parseNominatim(json)).toEqual({
      city: "Bhopal",
      state: "Madhya Pradesh",
      pincode: "462001",
    });
  });

  it("falls back to town and drops a malformed postcode", () => {
    expect(
      parseNominatim({ address: { town: "Sehore", postcode: "46A", country_code: "in" } }),
    ).toMatchObject({
      city: "Sehore",
      pincode: null,
    });
  });

  it("refuses places outside India", () => {
    expect(parseNominatim({ address: { city: "Dhaka", country_code: "bd" } })).toBeNull();
  });
});

describe("privacy and input limits", () => {
  it("rounds coordinates to about 110 m", () => {
    expect(roundCoordinate(23.2599333)).toBe(23.26);
    expect(roundCoordinate(77.412615)).toBe(77.413);
  });

  it("only looks up coordinates inside India", () => {
    expect(isInIndia(23.26, 77.41)).toBe(true);
    expect(isInIndia(51.5, -0.12)).toBe(false);
  });

  it("sends rounded coordinates and no identifiers to the reverse lookup", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ address: { city: "Bhopal", postcode: "462001", country_code: "in" } }),
    );
    await reverseGeocode(23.2599333, 77.412615, fetchImpl as unknown as typeof fetch);
    const url = String((fetchImpl.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("lat=23.26");
    expect(url).toContain("lon=77.413");
    expect(url).not.toContain("23.2599");
  });

  it("does not call the service for an invalid pincode or outside India", async () => {
    const fetchImpl = vi.fn();
    await expect(lookupPincode("012345", fetchImpl as unknown as typeof fetch)).resolves.toBeNull();
    await expect(
      reverseGeocode(51.5, -0.12, fetchImpl as unknown as typeof fetch),
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
