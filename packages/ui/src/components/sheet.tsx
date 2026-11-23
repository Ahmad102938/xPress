"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "../lib/utils";

/**
 * Sheet: a modal Dialog that is a bottom sheet (about 90% height) on small screens and a right-side
 * drawer (420px) from `md` up (docs/specs/auth.md G2, R1-M16). Built on the radix Dialog, so it has
 * a focus trap, Escape to close, focus return to the trigger and an accessible title.
 * The package holds no strings: callers pass `closeLabel` from their own messages.
 * Motion: none beyond the overlay fade, and that only when the user allows motion.
 */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title className={cn("text-xl font-bold text-ink", className)} {...props} />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-sm text-body", className)} {...props} />;
}

export interface SheetContentProps extends React.ComponentProps<typeof SheetPrimitive.Content> {
  /** Accessible name of the close button, from the caller's messages. */
  closeLabel: string;
  /** Hide the built-in close button when the caller renders its own header controls. */
  hideClose?: boolean;
}

export function SheetContent({
  className,
  children,
  closeLabel,
  hideClose = false,
  ...props
}: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/50 motion-safe:transition-opacity" />
      <SheetPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-[90dvh] flex-col overflow-y-auto rounded-t-xl bg-panel shadow-xl outline-none",
          "md:inset-y-0 md:right-0 md:left-auto md:h-dvh md:w-[420px] md:rounded-none",
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <SheetPrimitive.Close
            aria-label={closeLabel}
            className="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-tint-blue"
          >
            <X aria-hidden="true" className="size-5" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
