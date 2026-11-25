// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixturesAllowed, getHomeSource } from "./get-source";
import { realSource } from "./real";

const ctx = { firstName: "Test", hasPhone: true, hasAddress: false, place: null, searchParams: {} };

afterEach(() => vi.unstubAllEnvs());

describe("fixture provider production lock", () => {
  it("is impossible in production, even with the flag set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PATIENT_HOME_FIXTURES", "1");
    expect(fixturesAllowed(process.env)).toBe(false);
    expect((await getHomeSource()).name).toBe("real");
  });

  it("is off in development without the flag", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PATIENT_HOME_FIXTURES", "");
    expect((await getHomeSource()).name).toBe("real");
  });

  it("needs exactly '1'", () => {
    expect(fixturesAllowed({ NODE_ENV: "development", PATIENT_HOME_FIXTURES: "true" })).toBe(false);
  });

  it("is used in development with the flag", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PATIENT_HOME_FIXTURES", "1");
    expect((await getHomeSource()).name).toBe("dev-fixtures");
  });
});

describe("real source", () => {
  it("returns empties where no table exists and labelled sample data for Near you", async () => {
    expect(await realSource.upNext(ctx)).toBeNull();
    expect(await realSource.attention(ctx)).toEqual([]);
    expect(await realSource.yourDoctors(ctx)).toEqual([]);
    expect(await realSource.unfinishedBooking(ctx)).toBeNull();
    expect((await realSource.nearYou(ctx)).sample).toBe(true);
  });

  it("ignores the fixture switches", async () => {
    await expect(
      realSource.upNext({ ...ctx, searchParams: { __fixture_fail: "up_next" } }),
    ).resolves.toBeNull();
  });
});

describe("dev fixtures", () => {
  it("can force one section to fail", async () => {
    const { devFixtureSource } = await import("./dev-fixtures");
    await expect(
      devFixtureSource.yourDoctors({ ...ctx, searchParams: { __fixture_fail: "your_doctors" } }),
    ).rejects.toThrow();
    await expect(
      devFixtureSource.upNext({ ...ctx, searchParams: { __fixture_fail: "your_doctors" } }),
    ).resolves.not.toBeNull();
  });

  it("uses only visibly fake names and no condition, medicine or diagnosis fields", async () => {
    const { devFixtureSource } = await import("./dev-fixtures");
    const doctors = await devFixtureSource.yourDoctors(ctx);
    for (const doctor of doctors) expect(doctor.name).toMatch(/Test|Demo|Example/);
    const json = JSON.stringify([
      await devFixtureSource.upNext(ctx),
      await devFixtureSource.attention(ctx),
    ]);
    expect(json).not.toMatch(/condition|diagnos|medicine|symptom/i);
  });
});
