import { cn } from "@acurexpress/ui";

/** Initials avatar (docs/specs/signed-in-home.md: no photo upload yet). The name is the label. */
export function ProfileAvatar({ name, className }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts)
    .map((part) => Array.from(part ?? "")[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-tint-blue text-sm font-bold text-brand-blue",
        className,
      )}
    >
      {letters || "?"}
    </span>
  );
}
