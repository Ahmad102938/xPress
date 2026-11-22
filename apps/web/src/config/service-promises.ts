/**
 * Promise strip below the Home carousel.
 *
 * PRODUCT-OWNER OVERRIDE (2026-11-22): the product owner asked for these exact lines from the
 * existing store, knowingly overriding Product Context §25 ("do not copy claims such as
 * '100% guaranteed'") and showing them while medicine sales are still off.
 * TODO(HCQ): confirm each promise (delivery threshold, 24/7 helpline, authenticity wording,
 * price-match policy) before public launch, or change the copy here and in the message files.
 */
export type PromiseKey = "freeDelivery" | "support" | "authentic" | "bestPrices";

/** Icon colour. Brand palette plus error red for the price tag (decorative, text carries meaning). */
export type PromiseTone = "blue" | "green" | "navy" | "red";

export interface ServicePromise {
  key: PromiseKey;
  tone: PromiseTone;
}

/** Free-delivery threshold in rupees. TODO(HCQ): confirm. */
export const FREE_DELIVERY_THRESHOLD_INR = 499;

export const servicePromises: readonly ServicePromise[] = [
  { key: "freeDelivery", tone: "blue" },
  { key: "support", tone: "green" },
  { key: "authentic", tone: "navy" },
  { key: "bestPrices", tone: "red" },
];
