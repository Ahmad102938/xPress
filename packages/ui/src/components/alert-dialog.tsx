"use client";

import * as React from "react";
import { AlertDialog as AlertPrimitive } from "radix-ui";
import { cn } from "../lib/utils";

/**
 * Confirmation dialog for consequential actions (sign out everywhere, request deletion, the idle
 * warning). role="alertdialog"; Escape cancels; focus starts on the safe action. No strings here.
 */
export const AlertDialog = AlertPrimitive.Root;
export const AlertDialogTrigger = AlertPrimitive.Trigger;
export const AlertDialogAction = AlertPrimitive.Action;
export const AlertDialogCancel = AlertPrimitive.Cancel;

export function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertPrimitive.Title>) {
  return (
    <AlertPrimitive.Title className={cn("text-lg font-bold text-ink", className)} {...props} />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertPrimitive.Description>) {
  return <AlertPrimitive.Description className={cn("text-sm text-body", className)} {...props} />;
}

export function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertPrimitive.Content>) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/50 motion-safe:transition-opacity" />
      <AlertPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-line bg-panel p-6 shadow-xl outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </AlertPrimitive.Content>
    </AlertPrimitive.Portal>
  );
}
