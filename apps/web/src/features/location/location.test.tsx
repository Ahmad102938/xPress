import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { LocationPicker } from "@/components/layout/location-picker";
import { LocationProvider } from "./location-provider";
import { LocationSheet } from "./location-sheet";

// The sheet is rendered directly here (in the app it is lazy-loaded once in the site shell).
function Harness() {
  return (
    <LocationProvider>
      <LocationPicker variant="desktop" />
      <LocationSheet />
    </LocationProvider>
  );
}

function geolocation(impl: (ok: PositionCallback, fail: PositionErrorCallback) => void) {
  const getCurrentPosition = vi.fn(impl);
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: { getCurrentPosition },
    permissions: undefined,
  });
  return getCurrentPosition;
}

const denied = (_ok: PositionCallback, fail: PositionErrorCallback) =>
  fail({ code: 1, message: "denied" } as GeolocationPositionError);

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function render() {
  await act(async () => {
    renderWithIntl(<Harness />);
  });
}

describe("location", () => {
  it("defaults to Bhopal 462001 and asks for the location on a first visit", async () => {
    const ask = geolocation(denied);
    await render();
    expect(screen.getByRole("button", { name: /Deliver to Bhopal 462001/ })).toBeInTheDocument();
    expect(ask).toHaveBeenCalledOnce();
  });

  it("does not ask again once a location is saved", async () => {
    window.localStorage.setItem(
      "acx_location",
      JSON.stringify({ city: "Indore", pincode: "452001", source: "pincode" }),
    );
    const ask = geolocation(denied);
    await render();
    expect(screen.getByRole("button", { name: /Deliver to Indore 452001/ })).toBeInTheDocument();
    expect(ask).not.toHaveBeenCalled();
  });

  it("uses the current location through our reverse lookup", async () => {
    geolocation((ok) =>
      ok({ coords: { latitude: 23.2599, longitude: 77.4126 } } as GeolocationPosition),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ city: "Bhopal", pincode: "462003" })),
    );
    await render();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Deliver to Bhopal 462003/ })).toBeInTheDocument(),
    );
    expect(JSON.parse(window.localStorage.getItem("acx_location") ?? "{}")).toMatchObject({
      source: "gps",
    });
  });

  it("explains how to allow a blocked location", async () => {
    geolocation(denied);
    await render();
    fireEvent.click(screen.getByRole("button", { name: /Deliver to/ }));
    fireEvent.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Location is blocked for this site");
  });

  it("changes the location by pincode", async () => {
    geolocation(denied);
    const fetchMock = vi.fn(async () =>
      Response.json({ city: "Sehore", state: "Madhya Pradesh", pincode: "466001" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await render();
    fireEvent.click(screen.getByRole("button", { name: /Deliver to/ }));
    fireEvent.change(screen.getByLabelText("Enter a pincode"), { target: { value: "466001" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Deliver to Sehore 466001/ })).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/geo/pincode?pin=466001");
  });

  it("rejects a malformed pincode without a lookup", async () => {
    geolocation(denied);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await render();
    fireEvent.click(screen.getByRole("button", { name: /Deliver to/ }));
    fireEvent.change(screen.getByLabelText("Enter a pincode"), { target: { value: "0123" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a 6-digit pincode.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
