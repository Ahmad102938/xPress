import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { parseFlags } from "@acurexpress/core";
import { footerGroups } from "@/config/footer-links";
import {
  adminHrefsFound,
  adminTextFound,
  partnerHrefsFound,
  partnerTextFound,
} from "@/test/partner-free";
import { renderWithIntl } from "@/test/render";
import en from "@/i18n/messages/en.json";
import hi from "@/i18n/messages/hi.json";
import { FooterContent, type FooterContentProps } from "./site-footer";

// The language switcher needs the Next router; it is covered by e2e tests.
vi.mock("@/components/layout/language-switcher", () => ({ LanguageSwitcher: () => null }));

const BASE = "https://partners.example.test";
const flagsOff = parseFlags({});
const flagsOn = parseFlags({ FLAG_MEDICINE_SALES: "true", FLAG_AI_CONSULTANT: "true" });

function renderFooter(props: Partial<FooterContentProps> = {}, locale: "en" | "hi" = "en") {
  return renderWithIntl(
    <FooterContent
      year={2026}
      flags={flagsOff}
      partnerBase={BASE}
      placeholdersVisible={false}
      paymentsEnabled={false}
      {...props}
    />,
    { locale },
  );
}

const hrefsIn = (root: HTMLElement) =>
  [...root.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");

describe("FooterContent: groups and links", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["hi", hi],
  ] as const) {
    it(`${locale}: renders every group and every flag-free link`, () => {
      renderFooter({ flags: flagsOn }, locale);
      for (const group of footerGroups) {
        const nav = screen.getByRole("navigation", { name: messages.footer.groups[group.key] });
        for (const link of group.links) {
          if (link.flag === "shopNetwork") continue;
          expect(
            within(nav).getByRole("link", { name: messages.footer.links[link.key] }),
          ).toBeInTheDocument();
        }
      }
      expect(
        screen.getByText(`${messages.footer.disclaimer} ${messages.footer.disclaimerConsult}`),
      ).toBeInTheDocument();
      expect(
        screen.getByText(messages.footer.copyright.replace("{year}", "2026")),
      ).toBeInTheDocument();
    });
  }

  it("each group has its own distinct navigation label", () => {
    renderFooter();
    const names = screen
      .getAllByRole("navigation")
      .map((nav) => nav.getAttribute("aria-label") ?? nav.getAttribute("aria-labelledby"));
    expect(new Set(names).size).toBe(names.length);
  });

  it("signed-in pages go through login with a return path", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "My appointments" })).toHaveAttribute(
      "href",
      "/login?next=%2Fappointments",
    );
    expect(screen.getByRole("link", { name: "Consent preferences" })).toHaveAttribute(
      "href",
      "/login?next=%2Faccount%2Fprivacy",
    );
    expect(screen.getByRole("link", { name: "Report a problem or complaint" })).toHaveAttribute(
      "href",
      "/contact?topic=complaint",
    );
  });
});

describe("FooterContent: feature flags", () => {
  it("flags off: medicines, prescription upload, order tracking and health assistant are hidden", () => {
    renderFooter({ flags: flagsOff });
    for (const name of ["Medicines", "Upload prescription", "Track an order", "Health assistant"]) {
      expect(screen.queryByRole("link", { name })).toBeNull();
    }
  });

  it("flags on: they are shown", () => {
    renderFooter({ flags: flagsOn });
    expect(screen.getByRole("link", { name: "Medicines" })).toHaveAttribute("href", "/medicines");
    expect(screen.getByRole("link", { name: "Upload prescription" })).toHaveAttribute(
      "href",
      "/prescriptions/upload",
    );
    expect(screen.getByRole("link", { name: "Track an order" })).toHaveAttribute(
      "href",
      "/login?next=%2Forders",
    );
    expect(screen.getByRole("link", { name: "Health assistant" })).toHaveAttribute(
      "href",
      "/health-assistant",
    );
  });

  it("shop network off: no shop link in Find care", () => {
    renderFooter({ flags: parseFlags({ FLAG_SHOP_NETWORK: "false" }) });
    expect(screen.queryByRole("link", { name: "Medical shops near you" })).toBeNull();
  });

  it("payments line appears only when payments are enabled", () => {
    const { unmount } = renderFooter({ paymentsEnabled: false });
    expect(screen.queryByText("Secure online payments")).toBeNull();
    unmount();
    renderFooter({ paymentsEnabled: true });
    expect(screen.getByText("Secure online payments")).toBeInTheDocument();
  });
});

describe("FooterContent: TODO_HCQ placeholders", () => {
  it("are hidden in production (no contact lines, no office, CIN or GSTIN)", () => {
    const { container } = renderFooter({ placeholdersVisible: false });
    expect(container.textContent).not.toMatch(/TODO_HCQ/);
    expect(screen.queryByTestId("footer-contact")).toBeNull();
    expect(screen.queryByTestId("footer-company")).toBeNull();
    expect(screen.queryByText(/CIN:/)).toBeNull();
  });

  it("are shown in development so the layout can be reviewed", () => {
    renderFooter({ placeholdersVisible: true });
    expect(screen.getByTestId("footer-contact")).toHaveTextContent(
      "TODO_HCQ: confirm support email",
    );
    expect(screen.getByTestId("footer-company")).toHaveTextContent(
      "TODO_HCQ: confirm registered office address",
    );
    expect(screen.getByText(/CIN: TODO_HCQ/)).toBeInTheDocument();
  });

  it("no social links are shown while none is confirmed", () => {
    renderFooter({ placeholdersVisible: true });
    expect(screen.queryByRole("navigation", { name: "Follow us" })).toBeNull();
  });
});

describe("FooterContent: accordions", () => {
  it("are closed by default and toggle with their native button (Enter/Space work natively)", () => {
    renderFooter();
    const toggles = screen.getAllByRole("button", { expanded: false });
    expect(toggles).toHaveLength(footerGroups.length);
    const findCare = screen.getByRole("button", { name: "Find care" });
    expect(findCare.tagName).toBe("BUTTON");
    expect(findCare).toHaveAttribute("type", "button");
    const panel = document.getElementById(findCare.getAttribute("aria-controls") ?? "");
    expect(panel).toHaveClass("hidden");

    fireEvent.click(findCare);
    expect(findCare).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveClass("hidden");

    fireEvent.click(findCare);
    expect(findCare).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveClass("hidden");
  });
});

describe("FooterContent: bottom bar and partner link", () => {
  it("has one Become a partner link to the configured partner base, plus help, contact and sitemap", () => {
    renderFooter();
    const bar = screen.getByRole("navigation", { name: en.footer.bottom.label });
    const partner = within(bar).getByRole("link", { name: /Become a partner/ });
    expect(partner).toHaveAttribute("href", BASE);
    expect(partner).toHaveTextContent("(opens the partner site)");
    expect(within(bar).getByRole("link", { name: "Help centre" })).toHaveAttribute("href", "/help");
    expect(within(bar).getByRole("link", { name: "Contact us" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(within(bar).getByRole("link", { name: "Sitemap" })).toHaveAttribute("href", "/sitemap");
  });

  it("hides the partner link when there is no partner base URL (missing in production)", () => {
    renderFooter({ partnerBase: null });
    expect(screen.queryByRole("link", { name: /Become a partner/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Help centre" })).toBeInTheDocument();
  });

  it("partner wording and links exist only in the partner link; admin never appears", () => {
    const { container } = renderFooter({ flags: flagsOn, placeholdersVisible: true });
    const band = container.querySelector("[data-partner-band]") as HTMLElement;
    const outside = container.cloneNode(true) as HTMLElement;
    outside.querySelector("[data-partner-band]")?.remove();

    expect(partnerTextFound(outside.textContent ?? "")).toEqual([]);
    expect(partnerHrefsFound(hrefsIn(outside))).toEqual([]);
    expect(hrefsIn(band)).toEqual([BASE]);
    expect(adminTextFound(container.textContent ?? "")).toEqual([]);
    expect(adminHrefsFound(hrefsIn(container))).toEqual([]);
  });
});
