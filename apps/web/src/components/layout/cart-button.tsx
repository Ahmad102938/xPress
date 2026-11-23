import { ShoppingCart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@acurexpress/ui";
import { Link } from "@/i18n/navigation";

/**
 * Cart in the top bar, shown only while the medicine-sales flag is on (hard rule 11). The count
 * badge appears once a cart holds items (cart state is a later task; it is empty today).
 */
export async function CartButton({ className = "" }: { className?: string }) {
  const t = await getTranslations("header");
  return (
    <Link
      href="/cart"
      aria-label={t("cart")}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-tint-blue",
        className,
      )}
    >
      <ShoppingCart aria-hidden="true" className="size-6" />
    </Link>
  );
}
