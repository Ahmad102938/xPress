import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Small labels and chips. Always carry text (and usually an icon): never meaning by colour alone.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] leading-5 font-medium whitespace-nowrap [&>svg]:size-3.5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-line bg-panel text-body",
        blue: "border-transparent bg-tint-blue text-deep-blue",
        green: "border-transparent bg-tint-green text-green-ink",
        cream: "border-transparent bg-tint-cream text-on-amber",
        amber: "border-transparent bg-amber text-on-amber",
        warning: "border-transparent bg-warning-bg text-warning",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
