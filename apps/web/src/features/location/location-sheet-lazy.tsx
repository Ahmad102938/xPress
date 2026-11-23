"use client";

import dynamic from "next/dynamic";
import { useLocation } from "./location-provider";

/** Loads the "Deliver to" sheet only when it is first opened; rendered once in the site shell. */
const LocationSheet = dynamic(
  () => import("./location-sheet").then((module) => module.LocationSheet),
  {
    ssr: false,
  },
);

export function LocationSheetLazy() {
  const { isOpen } = useLocation();
  return isOpen ? <LocationSheet /> : null;
}
