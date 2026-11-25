import { describe, expect, it } from "vitest";
import {
  addressInput,
  addressUpsertInput,
  profileUpdateInput,
  dateOfBirthSchema,
  dependentInput,
  isMinor,
  istDate,
  mapPatientProfileError,
} from "./patient-profile";

const now = () => new Date("2026-11-24T10:00:00+05:30");

describe("isMinor (IST)", () => {
  it("is true the day before the 18th birthday", () => {
    expect(isMinor("2008-11-25", now())).toBe(true);
  });

  it("is false on the 18th birthday", () => {
    expect(isMinor("2008-11-24", now())).toBe(false);
  });

  it("uses the IST date, not UTC", () => {
    // 00:30 IST on 25 Nov is still 24 Nov in UTC.
    expect(istDate(new Date("2026-11-24T19:00:00Z"))).toBe("2026-11-25");
  });
});

describe("dateOfBirthSchema", () => {
  const schema = dateOfBirthSchema(now);
  it("accepts 1900-01-01 and today", () => {
    expect(schema.safeParse("1900-01-01").success).toBe(true);
    expect(schema.safeParse("2026-11-24").success).toBe(true);
  });

  it.each([
    ["1899-12-31", "date_too_old"],
    ["2026-11-25", "date_in_future"],
    ["24-11-2020", "invalid_date"],
    ["2020-02-31", "invalid_date"],
  ])("rejects %s with %s", (value, message) => {
    const result = schema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe("dependentInput", () => {
  const schema = dependentInput(now);
  const valid = { fullName: "Test Child", dateOfBirth: "2019-05-01", relationship: "child" };

  it("accepts a minimal dependent and fills defaults", () => {
    expect(schema.parse(valid)).toEqual({
      ...valid,
      gender: null,
      consultationLanguage: null,
      contactPhone: null,
      adultPermission: false,
    });
  });

  it("rejects self as a dependent relationship", () => {
    expect(schema.safeParse({ ...valid, relationship: "self" }).success).toBe(false);
  });

  it("rejects a contact number that is not E.164", () => {
    expect(schema.safeParse({ ...valid, contactPhone: "9000000003" }).success).toBe(false);
  });

  it("turns an empty contact number into null", () => {
    expect(schema.parse({ ...valid, contactPhone: "" }).contactPhone).toBeNull();
  });

  it("rejects a one-letter name", () => {
    expect(schema.safeParse({ ...valid, fullName: "X" }).success).toBe(false);
  });
});

describe("addressInput", () => {
  const valid = {
    label: "Home",
    line1: "12 Test Street",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462001",
  };

  it("accepts a valid address", () => {
    expect(addressInput.safeParse(valid).success).toBe(true);
  });

  it.each([["062001"], ["46200"], ["4620011"], ["abcdef"]])("rejects PIN %s", (pincode) => {
    expect(addressInput.safeParse({ ...valid, pincode }).success).toBe(false);
  });

  it("rejects a label longer than 30 characters", () => {
    expect(addressInput.safeParse({ ...valid, label: "x".repeat(31) }).success).toBe(false);
  });
});

describe("mapPatientProfileError", () => {
  it("passes through a database key", () => {
    expect(mapPatientProfileError({ code: "P0001", message: "limit_reached" })).toBe(
      "limit_reached",
    );
  });

  it("maps anything else to unavailable", () => {
    expect(mapPatientProfileError({ code: "42501", message: "permission denied" })).toBe(
      "unavailable",
    );
    expect(mapPatientProfileError({ code: "P0001", message: "something else" })).toBe(
      "unavailable",
    );
    expect(mapPatientProfileError(null)).toBe("unavailable");
  });
});

describe("profileUpdateInput", () => {
  const schema = profileUpdateInput(now);
  const id = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

  it("accepts a partial edit and an empty string to clear", () => {
    expect(schema.parse({ patientProfileId: id, gender: "" })).toEqual({
      patientProfileId: id,
      gender: "",
      adultPermission: false,
    });
  });

  it("rejects a profile id that is not a UUID", () => {
    expect(schema.safeParse({ patientProfileId: "1; drop table" }).success).toBe(false);
  });
});

describe("addressUpsertInput", () => {
  it("needs a patient profile id", () => {
    expect(
      addressUpsertInput.safeParse({
        label: "Home",
        line1: "12 Test Street",
        city: "Bhopal",
        state: "Madhya Pradesh",
        pincode: "462001",
      }).success,
    ).toBe(false);
  });
});
