import type { LucideIcon } from "lucide-react";
import { useId } from "react";

/*
 * Shared illustration pieces for the hero posters. Everything here is decorative (the slide has a
 * text description) and drawn with simple geometry: no real people, no names, no numbers that
 * could read as real data. Clothing and backgrounds use design tokens; skin and hair use a small
 * set of natural tones (the only non-token colours, needed to draw people).
 */

export const SKIN = { light: "#E0AC84", medium: "#C68863", deep: "#8D5A3C" } as const;
const HAIR = "#0F1B33"; // ink token

type HairStyle = "short" | "long" | "bun" | "covered";

interface BustProps {
  skin: string;
  /** Shirt or kurta colour. */
  top: string;
  hair?: HairStyle;
  /** White doctor's coat with a stethoscope. */
  doctor?: boolean;
  /** Round background behind the bust. */
  bg?: string;
  className?: string;
}

/** Front-facing head-and-shoulders figure. */
export function Bust({ skin, top, hair = "short", doctor, bg, className }: BustProps) {
  const clip = useId();
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {bg && <rect width="100" height="100" fill={bg} />}
        {hair === "long" && <path d="M31 40c0-15 9-24 19-24s19 9 19 24v26H31z" fill={HAIR} />}
        <path d="M12 104c2-22 17-34 38-34s36 12 38 34z" fill={doctor ? "#FFFFFF" : top} />
        {doctor && (
          <>
            <path d="M40 70l10 16 10-16 3 34H37z" fill={top} />
            <path
              d="M39 72c-2 10 2 18 9 19M61 72c2 10-2 18-9 19"
              fill="none"
              stroke={HAIR}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="50" cy="92" r="3.4" fill={HAIR} />
          </>
        )}
        <rect x="43" y="54" width="14" height="18" rx="6" fill={skin} />
        <ellipse cx="50" cy="41" rx="15" ry="17.5" fill={skin} />
        {hair === "short" && (
          <path
            d="M35 40c-1-14 7-21 15-21 10 0 17 6 15 21-3-8-8-11-15-11s-12 3-15 11z"
            fill={HAIR}
          />
        )}
        {hair === "long" && (
          <path d="M35 39c0-12 7-19 15-19s15 7 15 19c-5-6-9-9-15-9s-10 3-15 9z" fill={HAIR} />
        )}
        {hair === "bun" && (
          <>
            <circle cx="50" cy="20" r="7" fill={HAIR} />
            <path d="M35 39c0-12 7-18 15-18s15 6 15 18c-4-7-9-10-15-10s-11 3-15 10z" fill={HAIR} />
          </>
        )}
        {hair === "covered" && (
          <path
            d="M32 44c0-17 8-26 18-26s18 9 18 26v14c-4-8-6-20-18-22-12 2-14 14-18 22z"
            fill={top}
            opacity="0.9"
          />
        )}
      </g>
    </svg>
  );
}

/** Head and shoulders seen from behind (over-the-shoulder views). */
export function BackBust({ top, className }: { top: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M8 104c3-25 19-38 42-38s39 13 42 38z" fill={top} />
      <rect x="42" y="50" width="16" height="20" rx="7" fill={SKIN.medium} />
      <ellipse cx="33.5" cy="40" rx="3" ry="5" fill={SKIN.medium} />
      <ellipse cx="66.5" cy="40" rx="3" ry="5" fill={SKIN.medium} />
      <ellipse cx="50" cy="37" rx="17" ry="19" fill={HAIR} />
    </svg>
  );
}

/** Soft light and a faint plus-grid behind the visual. Gradients stay inside the banner (§25). */
export function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-plus-grid [mask-image:radial-gradient(ellipse_at_78%_55%,black,transparent_68%)]" />
      <div className="absolute top-[58%] right-[-12%] size-[34rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.24),transparent_62%)]" />
      <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.10),transparent_65%)]" />
    </div>
  );
}

/** Small white label floating in clear space next to a visual (ink on white, 15:1). */
export function FloatingChip({
  icon: Icon,
  label,
  className,
  tone = "green",
}: {
  icon: LucideIcon;
  label: string;
  className: string;
  tone?: "green" | "blue";
}) {
  return (
    <span
      className={`absolute z-20 inline-flex items-center gap-1.5 rounded-full bg-panel py-1.5 pr-3 pl-1.5 text-[13px] font-semibold whitespace-nowrap text-ink shadow-lg ring-1 ring-black/5 ${className}`}
    >
      <span
        className={`flex size-6 items-center justify-center rounded-full ${
          tone === "green" ? "bg-tint-green text-green-ink" : "bg-tint-blue text-brand-blue"
        }`}
      >
        <Icon className="size-3.5" />
      </span>
      {label}
    </span>
  );
}

/** Grey text placeholder (stands in for names and details, so nothing looks like real data). */
export function Bar({ className }: { className: string }) {
  return <span className={`block h-2 rounded-full ${className}`} />;
}
