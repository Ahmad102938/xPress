"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@acurexpress/ui";

const controlClass =
  "flex size-11 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-tint-blue";
const overlayControlClass = "md:text-white md:hover:bg-white/15 md:focus-visible:outline-white";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    // Server: assume reduced motion, so nothing auto-advances before hydration.
    () => true,
  );
}

interface BannerCarouselProps {
  /** Accessible name of the carousel region. */
  label: string;
  children: ReactNode;
  autoAdvanceMs?: number;
  /**
   * From md up, draw the controls on top of the slide (bottom-left, white on the banner) so the
   * hero stays short; below md they sit under the slide.
   */
  overlayControls?: boolean;
  className?: string;
}

/**
 * Accessible banner carousel (WAI-ARIA APG carousel pattern). About 7 s per slide by default.
 * - Native horizontal scroll with scroll-snap gives touch swipe without JS.
 * - Auto-advance pauses on hover, on keyboard focus, via the Pause button, and is off when the user
 *   prefers reduced motion.
 * - Left/Right arrow keys move between slides; dots and prev/next are real buttons (44px targets).
 * - Off-screen slides are `inert`, so Tab only reaches the visible slide's CTA.
 */
export function BannerCarousel({
  label,
  children,
  autoAdvanceMs = 7000,
  overlayControls = false,
  className,
}: BannerCarouselProps) {
  const t = useTranslations("hero");
  const slides = Children.toArray(children);
  const count = slides.length;

  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const autoplay = count > 1 && !userPaused && !interacting && !reducedMotion;

  const goTo = useCallback(
    (next: number) => {
      const track = trackRef.current;
      if (!track) return;
      const target = (next + count) % count;
      track.scrollTo({
        left: target * track.clientWidth,
        behavior: reducedMotion ? "auto" : "smooth",
      });
      indexRef.current = target;
      setIndex(target);
    },
    [count, reducedMotion],
  );

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setInterval(() => goTo(indexRef.current + 1), autoAdvanceMs);
    return () => window.clearInterval(id);
  }, [autoplay, autoAdvanceMs, goTo]);

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const current = Math.round(track.scrollLeft / track.clientWidth);
    if (current !== indexRef.current) {
      indexRef.current = current;
      setIndex(current);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    }
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn("relative", className)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setInteracting(false);
      }}
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        aria-live={autoplay ? "off" : "polite"}
        className="scroller w-full [scroll-padding-inline:0] rounded-2xl"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={t("slideLabel", { current: i + 1, total: count })}
            inert={i !== index}
            className="w-full shrink-0 basis-full"
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div
          className={cn(
            "mt-1 flex items-center justify-center gap-1",
            overlayControls && "md:absolute md:bottom-2 md:left-9 md:z-20 md:mt-0 md:justify-start",
          )}
        >
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label={t("previous")}
            className={cn(controlClass, overlayControls && overlayControlClass)}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <div className="flex items-center">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={t("goToSlide", { number: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "group flex size-11 cursor-pointer items-center justify-center",
                  overlayControls && "md:focus-visible:outline-white",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-2.5 rounded-full border border-deep-blue transition-all",
                    i === index ? "w-6 bg-deep-blue" : "w-2.5 bg-panel group-hover:bg-tint-blue",
                    overlayControls &&
                      (i === index
                        ? "md:border-white md:bg-white"
                        : "md:border-white md:bg-transparent md:group-hover:bg-white/40"),
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={t("next")}
            className={cn(controlClass, overlayControls && overlayControlClass)}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setUserPaused((paused) => !paused)}
              aria-label={userPaused ? t("play") : t("pause")}
              className={cn(controlClass, overlayControls && overlayControlClass)}
            >
              {userPaused ? (
                <Play aria-hidden="true" className="size-4" />
              ) : (
                <Pause aria-hidden="true" className="size-4" />
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
