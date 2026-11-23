import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { partnerHrefsFound, partnerTextFound } from "@/test/partner-free";
import { renderWithIntl } from "@/test/render";
import { ClinicsRow } from "./clinics-row";
import { Faq } from "./faq";
import { HowItWorks } from "./how-it-works";
import { ShopMapTeaser } from "./shop-map-teaser";
import { TrustStrip } from "./trust-strip";
import { WhyTrust } from "./why-trust";

/** Home sections that used to carry partner wording, plus FAQ and "how it works". */
function HomeSections() {
  return (
    <>
      <TrustStrip />
      <ClinicsRow />
      <ShopMapTeaser />
      <HowItWorks />
      <WhyTrust />
      <Faq />
    </>
  );
}

describe("Home sections are patient-only", () => {
  it("contain no partner or admin wording or links", () => {
    const { container } = renderWithIntl(<HomeSections />);
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    expect(partnerTextFound(container.textContent ?? "")).toEqual([]);
    expect(partnerHrefsFound(hrefs)).toEqual([]);
  });

  it("keeps the patient meaning of the rewritten copy", () => {
    renderWithIntl(<HomeSections />);
    expect(screen.getByRole("heading", { name: "Clinics on A-CureXpress" })).toBeInTheDocument();
    expect(screen.getByText("Listed clinics")).toBeInTheDocument();
    expect(screen.getByText(/See medical shops on a map/)).toBeInTheDocument();
    expect(
      screen.getByText(/Medical shops and pharmacies hold their own licences/),
    ).toBeInTheDocument();
  });
});
