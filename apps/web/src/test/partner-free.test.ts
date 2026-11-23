import { describe, expect, it } from "vitest";
import {
  adminHrefsFound,
  adminTextFound,
  partnerHrefsFound,
  partnerTextFound,
} from "./partner-free";

/** Negative control: the detectors used by the patient-only tests do catch the removed content. */
describe("partner/admin detectors", () => {
  it("catch the removed English and Hindi phrases", () => {
    for (const phrase of [
      "Become a partner",
      "For partners",
      "Join as a doctor",
      "List your clinic",
      "Register your shop",
      "Grow your practice with A-CureXpress",
      "For medical shops",
      "Admin",
      "पार्टनर बनें",
      "डॉक्टर के रूप में जुड़ें",
      "शॉप रजिस्टर करें",
    ]) {
      expect(partnerTextFound(phrase), phrase).not.toEqual([]);
    }
  });

  it("catch links to the partner/admin hosts and paths, and ignore patient links", () => {
    const hrefs = [
      "https://partners.acurexpress.com/",
      "http://admin.localhost:3002/login",
      "/partner",
      "/hi/admin/users",
      "/for-doctors",
      "/hi/for-shops",
      "/doctors",
      "/hi/clinics",
      "/administer-dose",
    ];
    expect(partnerHrefsFound(hrefs)).toEqual(hrefs.slice(0, 6));
  });

  it("allow ordinary patient copy", () => {
    expect(partnerTextFound("Clinics on A-CureXpress. Book a doctor online.")).toEqual([]);
  });

  it("admin detectors catch admin wording and links in both languages", () => {
    expect(adminTextFound("Admin login")).not.toEqual([]);
    expect(adminTextFound("एडमिन")).not.toEqual([]);
    expect(adminTextFound("Become a partner")).toEqual([]);
    expect(adminHrefsFound(["https://admin.acurexpress.com", "/hi/admin", "/partner"])).toEqual([
      "https://admin.acurexpress.com",
      "/hi/admin",
    ]);
  });
});
