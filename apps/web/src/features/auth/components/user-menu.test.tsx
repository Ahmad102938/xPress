import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";

vi.mock("../actions", () => ({ signOut: vi.fn() }));
const { UserMenu } = await import("./user-menu");

const session = { state: "signed_in" as const, name: "Asha Devi", avatarUrl: null, initials: "AD" };

describe("UserMenu", () => {
  it("shows initials and opens the account links", () => {
    renderWithIntl(<UserMenu session={session} />);
    const button = screen.getByRole("button", { name: "Account menu for Asha Devi" });
    expect(button).toHaveTextContent("AD");
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "My appointments" })).toHaveAttribute(
      "href",
      "/appointments",
    );
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/account");
  });

  it("logs out through a form (POST), not a link", () => {
    renderWithIntl(<UserMenu session={session} />);
    fireEvent.click(screen.getByRole("button", { name: /Account menu/ }));
    const logout = screen.getByRole("button", { name: "Log out" });
    expect(logout).toHaveAttribute("type", "submit");
    expect(logout.closest("form")).not.toBeNull();
  });

  it("closes on Escape and returns focus to the button", () => {
    renderWithIntl(<UserMenu session={session} />);
    const button = screen.getByRole("button", { name: /Account menu/ });
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("shows the Google photo when there is one", () => {
    const { container } = renderWithIntl(
      <UserMenu session={{ ...session, avatarUrl: "https://example.test/a.png" }} />,
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.test/a.png");
  });
});
