"use client";

import { Component, Suspense, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, cn } from "@acurexpress/ui";

/**
 * One home section's boundary (docs/specs/signed-in-home.md item 52): its own Suspense skeleton
 * and its own error fallback, all at the same minimum height, so one failing section never blanks
 * the page and nothing jumps when it loads or fails.
 */

function SectionError({ minHeight, onRetry }: { minHeight: string; onRetry: () => void }) {
  const t = useTranslations("patientHome.sectionError");
  const router = useRouter();
  return (
    <div
      role="alert"
      className={cn(
        "panel flex flex-col items-start justify-center gap-3 border border-line p-4",
        minHeight,
      )}
    >
      <p className="font-medium text-ink">{t("title")}</p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          onRetry();
          router.refresh();
        }}
      >
        {t("retry")}
      </Button>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  minHeight: string;
  section: string;
}

class ErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    // Section id only; never the error text (it could carry data).
    console.error(`[home] section failed: ${this.props.section}`);
  }

  override render() {
    if (this.state.failed) {
      return (
        <SectionError
          minHeight={this.props.minHeight}
          onRetry={() => this.setState({ failed: false })}
        />
      );
    }
    return this.props.children;
  }
}

export function SectionSkeleton({ minHeight }: { minHeight: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("panel border border-line motion-safe:animate-pulse", minHeight)}
    />
  );
}

export function SectionBoundary({
  section,
  minHeight,
  children,
}: {
  section: string;
  minHeight: string;
  children: ReactNode;
}) {
  return (
    <div data-section={section} className={minHeight}>
      <ErrorBoundary section={section} minHeight={minHeight}>
        <Suspense fallback={<SectionSkeleton minHeight={minHeight} />}>{children}</Suspense>
      </ErrorBoundary>
    </div>
  );
}
