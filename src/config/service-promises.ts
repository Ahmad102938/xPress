import type { FlagName } from "@/lib/flags";

/**
 * Items for the service-promise strip above the Home carousel.
 *
 * Hard rule 7 and §25: every promise on screen must be true today. Commerce promises
 * (delivery, pricing, support hours) only render when BOTH:
 *   1. their feature flag is on (medicine sales is a regulated service, off by default), and
 *   2. HCQ Care has confirmed the promise in writing (`confirmedByHcq: true`).
 * Never use "100% guaranteed" style claims (§25 explicitly forbids them).
 */
export type PromiseKey =
  | "freeDelivery"
  | "support"
  | "licensedPharmacies"
  | "clearPricing"
  | "verifiedDoctors"
  | "clinicOrOnline"
  | "securePayments"
  | "privateRecords";

export type PromiseTone = "blue" | "green" | "amber" | "navy";

export interface ServicePromise {
  key: PromiseKey;
  tone: PromiseTone;
  flag?: FlagName;
  /** Commerce promises stay hidden until HCQ confirms them. */
  confirmedByHcq?: boolean;
}

/** Free-delivery threshold in rupees. TODO(HCQ): confirm before enabling `freeDelivery`. */
export const FREE_DELIVERY_THRESHOLD_INR = 499;

/** Ordered by priority. The strip shows the first four that are eligible. */
export const servicePromises: readonly ServicePromise[] = [
  { key: "freeDelivery", tone: "blue", flag: "medicineSales", confirmedByHcq: false },
  { key: "support", tone: "green", flag: "medicineSales", confirmedByHcq: false },
  { key: "licensedPharmacies", tone: "navy", flag: "medicineSales", confirmedByHcq: false },
  { key: "clearPricing", tone: "amber", flag: "medicineSales", confirmedByHcq: false },
  // True today (Phase 1 product rules).
  { key: "verifiedDoctors", tone: "blue" },
  { key: "clinicOrOnline", tone: "green" },
  { key: "securePayments", tone: "navy" },
  { key: "privateRecords", tone: "amber" },
];

export const PROMISE_STRIP_SIZE = 4;
