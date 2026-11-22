import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * Buttons. Every size keeps a 44px minimum touch target (§25 says 48px where space allows: use lg).
 * Focus ring comes from the global :focus-visible style; add `focus-light` on dark surfaces.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Main actions and links: brand blue. */
        primary: "bg-brand-blue text-white hover:bg-deep-blue",
        /** Book / Add actions: solid brand green with white text (§25). */
        book: "bg-brand-green text-white hover:bg-green-ink",
        /** Highlight / deal actions: amber with dark text. */
        amber: "bg-amber text-on-amber hover:bg-[#f0a800]",
        outline: "border border-brand-blue bg-panel text-brand-blue hover:bg-tint-blue",
        /** White button for use on blue banners. */
        onDark: "bg-white text-deep-blue hover:bg-tint-blue",
        ghost: "text-ink hover:bg-tint-blue",
        link: "text-brand-blue underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 text-sm",
        sm: "min-h-11 px-3 text-sm",
        lg: "min-h-12 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (for example a Link) with button styles. */
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
