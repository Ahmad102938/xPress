import { describe, expect, it } from "vitest";
import { PRIVATE_PREFIXES, routeClass, stripLocalePrefix } from "./route-class";

const locales = ["en", "hi"] as const;
const cls = (path: string) => routeClass(path, locales);

describe("routeClass", () => {
  it.each([["/"], ["/hi"], ["/hi/"], ["/en"]])("%s is the home", (path) => {
    expect(cls(path)).toBe("home");
  });

  it.each([
    ["/appointments"],
    ["/appointments/3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f"],
    ["/hi/profile"],
    ["/account/"],
    ["/support"],
    ["/home"],
    ["/hi/home"],
  ])("%s is private", (path) => {
    expect(cls(path)).toBe("private");
  });

  it.each([["/doctors"], ["/appointmentsX"], ["/hi/doctors"], ["/login"], ["/accounting"]])(
    "%s is public",
    (path) => {
      expect(cls(path)).toBe("public");
    },
  );

  it("treats /auth/* as auth", () => {
    expect(cls("/auth/callback")).toBe("auth");
  });

  it("lists exactly the private prefixes from the spec", () => {
    expect(PRIVATE_PREFIXES).toEqual([
      "/appointments",
      "/profile",
      "/account",
      "/support",
      "/home",
    ]);
  });
});

describe("stripLocalePrefix", () => {
  it("separates the Hindi prefix", () => {
    expect(stripLocalePrefix("/hi/profile", locales)).toEqual({ locale: "hi", path: "/profile" });
    expect(stripLocalePrefix("/profile", locales)).toEqual({ locale: null, path: "/profile" });
  });
});
