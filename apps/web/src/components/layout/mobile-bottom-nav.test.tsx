import { screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { partnerHrefsFound, partnerTextFound } from "@/test/partner-free";
import { renderWithIntl } from "@/test/render";
import { MobileBottomNav } from "./mobile-bottom-nav";

// Outside the Next router: render links as plain anchors and pretend we are on Home.
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));

describe("MobileBottomNav", () => {
  it("has only patient tabs, no partner or admin entries", () => {
    const { container } = renderWithIntl(<MobileBottomNav showShops />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href") ?? "");
    expect(hrefs).toEqual(["/", "/doctors", "/consult", "/shops", "/account"]);
    expect(partnerHrefsFound(hrefs)).toEqual([]);
    expect(partnerTextFound(container.textContent ?? "")).toEqual([]);
  });

  it("keeps Account a plain /account link; the auth interceptor opens the panel when signed out", () => {
    renderWithIntl(<MobileBottomNav showShops />);
    const account = screen.getByRole("link", { name: "Account" });
    expect(account).toHaveAttribute("href", "/account");
    expect(account).not.toHaveAttribute("aria-current");
  });
});
