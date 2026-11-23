import { describe, expect, it } from "vitest";
import {
  emailSchema,
  finishSignupInput,
  fullNameSchema,
  otpCodeSchema,
  phoneSchema,
  sendPhoneOtpInput,
  verifyOtpInput,
} from "./auth-schemas";

describe("phoneSchema", () => {
  it("normalises valid Indian mobiles", () => {
    expect(phoneSchema.parse("98765 43210")).toBe("+919876543210");
  });

  it("rejects other numbers with the invalid_phone key", () => {
    const result = phoneSchema.safeParse("+14155550123");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("invalid_phone");
  });
});

describe("emailSchema", () => {
  it("normalises and accepts a valid address", () => {
    expect(emailSchema.parse("  Test@Example.TEST ")).toBe("test@example.test");
  });

  it.each([["not-an-email"], ["a@b"], [""]])("rejects %s", (value) => {
    expect(emailSchema.safeParse(value).success).toBe(false);
  });
});

describe("otpCodeSchema", () => {
  it("accepts exactly six digits", () => {
    expect(otpCodeSchema.parse(" 123456 ")).toBe("123456");
  });

  it.each([["12345"], ["1234567"], ["12a456"], [""]])("rejects %s", (value) => {
    expect(otpCodeSchema.safeParse(value).success).toBe(false);
  });
});

describe("fullNameSchema", () => {
  it.each([
    ["  Asha   Devi ", "Asha Devi"],
    ["राम प्रसाद", "राम प्रसाद"],
    ["O'Brien-Kumar", "O'Brien-Kumar"],
    ["A. Kumar", "A. Kumar"],
  ])("accepts %s", (value, expected) => {
    expect(fullNameSchema.parse(value)).toBe(expected);
  });

  it.each([["A"], ["   "], ["Robert'); DROP TABLE--"], ["12345"], ["x".repeat(81)], ["-Asha"]])(
    "rejects %s",
    (value) => {
      expect(fullNameSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("action inputs", () => {
  it("parses a phone send with an optional captcha token", () => {
    expect(sendPhoneOtpInput.parse({ phone: "9876543210" })).toEqual({ phone: "+919876543210" });
  });

  it("verifies by channel", () => {
    expect(
      verifyOtpInput.parse({ channel: "email", destination: "T@Example.test", code: "123456" }),
    ).toEqual({
      channel: "email",
      destination: "t@example.test",
      code: "123456",
    });
    expect(
      verifyOtpInput.safeParse({ channel: "sms", destination: "x", code: "123456" }).success,
    ).toBe(false);
  });

  it("requires the Terms box at Finish sign-up and keeps marketing optional", () => {
    expect(
      finishSignupInput.safeParse({ fullName: "Asha Devi", marketing: false, acceptTerms: true })
        .success,
    ).toBe(true);
    const missing = finishSignupInput.safeParse({
      fullName: "Asha Devi",
      marketing: true,
      acceptTerms: false,
    });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.message).toBe("terms_required");
  });
});
