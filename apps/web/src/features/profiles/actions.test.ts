// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
  }),
  headers: async () => new Headers({ "x-request-id": "req-12345678" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.spyOn(console, "info").mockImplementation(() => {});

const rpc = vi.fn();
let guardOk = true;
vi.mock("@/features/auth/server/profile-guard", () => ({
  profileGuard: async () =>
    guardOk
      ? { ok: true, supabase: { rpc }, userId: "user-1", user: { id: "user-1" } }
      : { ok: false, error: "unavailable" },
}));
let allowed: boolean | "error" = true;
vi.mock("@/features/auth/server/limiter", () => ({ within: async () => allowed }));

const actions = await import("./actions");

const CHILD = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const ADDRESS = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

beforeEach(() => {
  guardOk = true;
  allowed = true;
  jar.clear();
  rpc.mockReset();
  rpc.mockResolvedValue({ data: CHILD, error: null });
});

describe("createDependent", () => {
  const valid = { fullName: "Test Child", dateOfBirth: "2019-05-01", relationship: "child" };

  it("calls create_dependent with the validated fields", async () => {
    await expect(actions.createDependent(valid)).resolves.toEqual({ ok: true, value: CHILD });
    expect(rpc).toHaveBeenCalledWith("create_dependent", {
      p_full_name: "Test Child",
      p_date_of_birth: "2019-05-01",
      p_relationship: "child",
      p_adult_permission: false,
    });
  });

  it("rejects invalid input before any call", async () => {
    await expect(
      actions.createDependent({ ...valid, relationship: "self" }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes the database's adult-permission key through", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "adult_permission_required" },
    });
    await expect(
      actions.createDependent({ ...valid, dateOfBirth: "1950-01-01", relationship: "parent" }),
    ).resolves.toEqual({
      ok: false,
      error: "adult_permission_required",
    });
  });

  it("is refused for a session that is not fully signed in", async () => {
    guardOk = false;
    await expect(actions.createDependent(valid)).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    allowed = false;
    await expect(actions.createDependent(valid)).resolves.toEqual({
      ok: false,
      error: "rate_limited",
    });
  });
});

describe("updatePatientProfile", () => {
  it("turns empty strings into p_clear and leaves absent fields unchanged", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await actions.updatePatientProfile({
      patientProfileId: CHILD,
      fullName: "Test Child Two",
      gender: "",
      contactPhone: "",
    });
    expect(rpc).toHaveBeenCalledWith("update_patient_profile", {
      p_profile_id: CHILD,
      p_full_name: "Test Child Two",
      p_clear: ["gender", "contact_phone"],
      p_adult_permission: false,
    });
  });

  it("maps another account's profile to not_found", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "not_found" } });
    await expect(
      actions.updatePatientProfile({ patientProfileId: CHILD, fullName: "Hacked Name" }),
    ).resolves.toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("rejects an id that is not a UUID", async () => {
    await expect(actions.updatePatientProfile({ patientProfileId: "../x" })).resolves.toMatchObject(
      { error: "invalid_input" },
    );
  });
});

describe("archive and restore", () => {
  it("archives by id and reports self_profile for the self profile", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "self_profile" } });
    await expect(actions.archiveDependent(CHILD)).resolves.toEqual({
      ok: false,
      error: "self_profile",
    });
    expect(rpc).toHaveBeenCalledWith("archive_dependent", { p_profile_id: CHILD });
  });

  it("maps unknown database errors to unavailable", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "boom" } });
    await expect(actions.restoreDependent(CHILD)).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });
  });
});

describe("addresses", () => {
  const address = {
    patientProfileId: CHILD,
    label: "Home",
    line1: "12 Test Street",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462001",
  };

  it("adds an address for the given profile", async () => {
    rpc.mockResolvedValue({ data: ADDRESS, error: null });
    await expect(actions.upsertAddress(address)).resolves.toEqual({ ok: true, value: ADDRESS });
    expect(rpc).toHaveBeenCalledWith(
      "upsert_patient_address",
      expect.objectContaining({ p_profile_id: CHILD, p_pincode: "462001", p_clear: [] }),
    );
  });

  it("clears empty optional lines when editing", async () => {
    rpc.mockResolvedValue({ data: ADDRESS, error: null });
    await actions.upsertAddress({ ...address, addressId: ADDRESS, line2: "" });
    expect(rpc).toHaveBeenCalledWith(
      "upsert_patient_address",
      expect.objectContaining({ p_address_id: ADDRESS, p_clear: ["line2", "landmark"] }),
    );
  });

  it("rejects a bad PIN before any call", async () => {
    await expect(actions.upsertAddress({ ...address, pincode: "062001" })).resolves.toMatchObject({
      error: "invalid_input",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("deletes and sets the default by address id", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await actions.deleteAddress(ADDRESS);
    await actions.setDefaultAddress(ADDRESS);
    expect(rpc).toHaveBeenNthCalledWith(1, "delete_patient_address", { p_address_id: ADDRESS });
    expect(rpc).toHaveBeenNthCalledWith(2, "set_default_address", { p_address_id: ADDRESS });
  });
});

describe("selectProfile", () => {
  it("sets the cookie only for a profile the account can manage", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(actions.selectProfile(CHILD)).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("can_act_for", { p_profile: CHILD, p_capability: "manage" });
    expect(jar.get("acx_profile")).toBe(CHILD);
  });

  it("returns not_found for another account's profile and sets nothing", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(actions.selectProfile(CHILD)).resolves.toEqual({ ok: false, error: "not_found" });
    expect(jar.has("acx_profile")).toBe(false);
  });
});

describe("dismissProfileCard", () => {
  it("remembers the dismissal in a cookie with no personal data", async () => {
    await actions.dismissProfileCard();
    expect(jar.get("acx_dismiss_profile_card")).toBe("1");
  });
});
