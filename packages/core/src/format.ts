/** Formats a rupee amount for display. Amounts are whole rupees in mock data. */
export function formatInr(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
