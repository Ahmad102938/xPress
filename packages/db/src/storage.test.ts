import { afterEach, describe, expect, it, vi } from "vitest";
import { PRIVATE_BUCKETS, SIGNED_URL_TTL_SECONDS, createSignedFileUrl } from "./storage";

const path = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.pdf";

function fakeClient(result: { data: { signedUrl: string } | null; error: unknown }) {
  const createSignedUrl = vi.fn(async () => result);
  const from = vi.fn(() => ({ createSignedUrl }));
  return { client: { storage: { from } }, from, createSignedUrl };
}

afterEach(() => vi.unstubAllGlobals());

describe("createSignedFileUrl", () => {
  it("has no private bucket until a module adds one", () => {
    expect(PRIVATE_BUCKETS).toEqual([]);
  });

  it("signs for 60 seconds with the caller's client", async () => {
    const { client, from, createSignedUrl } = fakeClient({
      data: { signedUrl: "https://signed" },
      error: null,
    });
    expect(await createSignedFileUrl(client, "records", path, ["records"])).toBe("https://signed");
    expect(from).toHaveBeenCalledWith("records");
    expect(createSignedUrl).toHaveBeenCalledWith(path, 60);
    expect(SIGNED_URL_TTL_SECONDS).toBe(60);
  });

  it("rejects a bucket that is not listed as private", async () => {
    const { client } = fakeClient({ data: null, error: null });
    await expect(createSignedFileUrl(client, "public-images", path, ["records"])).rejects.toThrow(
      /private bucket/,
    );
  });

  it("rejects a path that is not <owner uuid>/<uuid>.<ext>", async () => {
    const { client } = fakeClient({ data: null, error: null });
    await expect(
      createSignedFileUrl(client, "records", "../other/file.pdf", ["records"]),
    ).rejects.toThrow(/Path/);
  });

  it("returns null when signing fails", async () => {
    const { client } = fakeClient({ data: null, error: new Error("denied") });
    expect(await createSignedFileUrl(client, "records", path, ["records"])).toBeNull();
  });

  it("refuses to run in a browser", async () => {
    vi.stubGlobal("window", {});
    const { client } = fakeClient({ data: null, error: null });
    await expect(createSignedFileUrl(client, "records", path, ["records"])).rejects.toThrow(
      /server-only/,
    );
  });
});
