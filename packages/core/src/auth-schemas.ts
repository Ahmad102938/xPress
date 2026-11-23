import { z } from "zod";
import { normalizeEmail } from "./email";
import { normalizeIndianPhone } from "./phone";

/**
 * zod schemas for the auth server actions (docs/specs/auth.md item 14). Apps import these from
 * @acurexpress/core and never import zod directly (R1-M16). Issue messages are i18n keys.
 */

export const phoneSchema = z
  .string()
  .max(32)
  .transform((value, ctx) => {
    const normalized = normalizeIndianPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "invalid_phone" });
      return z.NEVER;
    }
    return normalized;
  });

export const emailSchema = z
  .string()
  .max(254)
  .transform(normalizeEmail)
  .pipe(z.email({ message: "invalid_email" }));

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: "invalid_code" });

/** 2 to 80 characters after trimming; letters in any script (incl. Devanagari), spaces, . ' - */
export const fullNameSchema = z
  .string()
  .max(200)
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, { message: "invalid_name" })
      .max(80, { message: "invalid_name" })
      .regex(/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u, { message: "invalid_name" }),
  );

export const marketingSchema = z.boolean();

const captchaToken = z.string().max(4096).optional();

export const sendPhoneOtpInput = z.object({ phone: phoneSchema, captchaToken });
export const sendEmailOtpInput = z.object({ email: emailSchema, captchaToken });

export const verifyOtpInput = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("phone"), destination: phoneSchema, code: otpCodeSchema }),
  z.object({ channel: z.literal("email"), destination: emailSchema, code: otpCodeSchema }),
]);

export const finishSignupInput = z.object({
  fullName: fullNameSchema,
  marketing: marketingSchema,
  acceptTerms: z.literal(true, { message: "terms_required" }),
});

export type SendPhoneOtpInput = z.input<typeof sendPhoneOtpInput>;
export type SendEmailOtpInput = z.input<typeof sendEmailOtpInput>;
export type VerifyOtpInput = z.input<typeof verifyOtpInput>;
export type FinishSignupInput = z.input<typeof finishSignupInput>;
