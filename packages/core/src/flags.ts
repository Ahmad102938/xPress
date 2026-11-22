import { z } from "zod";

/**
 * Feature flags (docs/ACureXpress_Product_Context.md hard rule 11, §24 rule 8).
 *
 * - The four product flags (medicine sales, online prescribing, AI consultant, native-app features)
 *   default to false. Regulated services stay off until HCQ Care clears the launch gate.
 * - `shopNetwork` is a module switch for Phase 1 shop discovery (not a regulated service), so it
 *   defaults to true and can be turned off with FLAG_SHOP_NETWORK=false.
 * - Only "true" / "false" (case-insensitive) change a flag; anything else falls back to the default.
 * - Server-side env vars (no NEXT_PUBLIC_ prefix). Server components read them and pass booleans
 *   to client components as props. Never hard-code a flag value in a component.
 *   Changing a flag needs a rebuild/redeploy because public pages are prerendered.
 */
export const flagDefinitions = {
  medicineSales: { env: "FLAG_MEDICINE_SALES", default: false },
  onlinePrescribing: { env: "FLAG_ONLINE_PRESCRIBING", default: false },
  aiConsultant: { env: "FLAG_AI_CONSULTANT", default: false },
  nativeAppFeatures: { env: "FLAG_NATIVE_APP_FEATURES", default: false },
  shopNetwork: { env: "FLAG_SHOP_NETWORK", default: true },
} as const satisfies Record<string, { env: string; default: boolean }>;

export type FlagName = keyof typeof flagDefinitions;
export type Flags = Readonly<Record<FlagName, boolean>>;

const flagValue = z
  .string()
  .optional()
  .transform((value) => {
    const normalised = value?.trim().toLowerCase();
    if (normalised === "true") return true;
    if (normalised === "false") return false;
    return undefined;
  });

export function parseFlags(env: Record<string, string | undefined>): Flags {
  const result = {} as Record<FlagName, boolean>;
  for (const name of Object.keys(flagDefinitions) as FlagName[]) {
    const definition = flagDefinitions[name];
    result[name] = flagValue.parse(env[definition.env]) ?? definition.default;
  }
  return Object.freeze(result);
}

/** Current flags for this server process. */
export function getFlags(): Flags {
  return parseFlags(process.env);
}
