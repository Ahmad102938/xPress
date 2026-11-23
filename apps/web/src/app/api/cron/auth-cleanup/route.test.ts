// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const unconfirmedUsersOlderThan = vi.fn();
const deleteAuthUser = vi.fn();
const rateLimitsCleanup = vi.fn();
vi.mock("@acurexpress/db", () => ({ hasSupabaseEnv: () => true }));
vi.mock("@acurexpress/db/admin", () => ({
  unconfirmedUsersOlderThan: (hours: number) => unconfirmedUsersOlderThan(hours),
  deleteAuthUser: (id: string) => deleteAuthUser(id),
  rateLimitsCleanup: () => rateLimitsCleanup(),
}));
vi.spyOn(console, "info").mockImplementation(() => {});

const { GET } = await import("./route");

function call(authorization?: string) {
  return GET(
    new Request("http://localhost/api/cron/auth-cleanup", {
      headers: authorization ? { authorization } : {},
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  unconfirmedUsersOlderThan.mockResolvedValue(["u1", "u2"]);
  deleteAuthUser.mockResolvedValue(undefined);
  rateLimitsCleanup.mockResolvedValue(3);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/cron/auth-cleanup", () => {
  it.each([[undefined], ["Bearer wrong"], ["test-cron-secret"]])(
    "rejects a missing or wrong secret (%s)",
    async (header) => {
      expect((await call(header)).status).toBe(401);
      expect(unconfirmedUsersOlderThan).not.toHaveBeenCalled();
    },
  );

  it("rejects every call when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
  });

  it("deletes only users from the 24-hour definer list, then old limiter windows", async () => {
    const response = await call("Bearer test-cron-secret");
    expect(await response.json()).toEqual({ ok: true, deletedUsers: 2, deletedWindows: 3 });
    expect(unconfirmedUsersOlderThan).toHaveBeenCalledWith(24);
    expect(deleteAuthUser.mock.calls).toEqual([["u1"], ["u2"]]);
    expect(rateLimitsCleanup).toHaveBeenCalledOnce();
  });

  it("keeps going when one deletion fails", async () => {
    deleteAuthUser.mockRejectedValueOnce(new Error("boom"));
    expect(await (await call("Bearer test-cron-secret")).json()).toMatchObject({ deletedUsers: 1 });
  });
});
