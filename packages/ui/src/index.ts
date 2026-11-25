/** @acurexpress/ui public API: primitives, brand components, `cn`, and the shared UI strings. */
export { cn } from "./lib/utils";

export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";
export { RatingStars } from "./components/rating-stars";
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  type SheetContentProps,
} from "./components/sheet";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  type DialogContentProps,
} from "./components/dialog";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/alert-dialog";
export { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "./components/popover";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/dropdown-menu";

export { Logo } from "./brand/logo";
export { DoctorBadge, RegisteredBadge, VerifiedBadge } from "./brand/verification-badge";

export { uiMessages, type UiMessages } from "./messages";
