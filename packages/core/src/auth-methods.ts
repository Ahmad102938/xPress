/**
 * Sign-in methods and the AUTH_METHODS setting (docs/specs/auth.md G1, R2-M5).
 * New methods (WhatsApp codes, passkeys) are added as new registry entries.
 */

export const AUTH_METHOD_IDS = ["phone", "email", "google"] as const;
export type AuthMethodId = (typeof AUTH_METHOD_IDS)[number];

export interface AuthMethod {
  id: AuthMethodId;
  /** One-time code typed into the panel, or a redirect to a provider. */
  kind: "otp" | "oauth";
}

export const AUTH_METHOD_REGISTRY: Readonly<Record<AuthMethodId, AuthMethod>> = {
  phone: { id: "phone", kind: "otp" },
  email: { id: "email", kind: "otp" },
  google: { id: "google", kind: "oauth" },
};

const DEFAULT_METHODS: readonly AuthMethodId[] = ["google"];

function isAuthMethodId(value: string): value is AuthMethodId {
  return (AUTH_METHOD_IDS as readonly string[]).includes(value);
}

/**
 * Parses a comma list such as "phone,email,google".
 * - Unset or blank means ["google"].
 * - Unknown values throw, so a typo fails the build instead of silently hiding a method.
 * - Phone is always first when present; the others keep their written order; duplicates drop.
 * - `blockAll` (production with placeholder legal versions) returns [] whatever the value says.
 */
export function parseAuthMethods(
  value: string | undefined,
  opts: { blockAll: boolean },
): AuthMethodId[] {
  if (opts.blockAll) return [];
  const raw = value?.trim();
  if (!raw) return [...DEFAULT_METHODS];

  const ids: AuthMethodId[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim().toLowerCase();
    if (!id) continue;
    if (!isAuthMethodId(id)) {
      throw new Error(`AUTH_METHODS contains an unknown method: "${id}"`);
    }
    if (!ids.includes(id)) ids.push(id);
  }
  if (ids.length === 0) return [...DEFAULT_METHODS];

  return ids.includes("phone") ? ["phone", ...ids.filter((id) => id !== "phone")] : ids;
}
