/**
 * Time-aware greeting for the signed-in home (docs/specs/signed-in-home.md item 10).
 * The hour is read in the patient's time zone (India: Asia/Kolkata), never the server's.
 */

export type GreetingPart = "morning" | "afternoon" | "evening";

export function greetingFor(date: Date, timeZone = "Asia/Kolkata"): GreetingPart {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone }).format(date),
  );
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/** The first word of a full name, for "Good morning, Masum". Empty input gives null. */
export function firstName(fullName: string | null | undefined): string | null {
  const first = (fullName ?? "").trim().split(/\s+/, 1)[0];
  return first ? first : null;
}
