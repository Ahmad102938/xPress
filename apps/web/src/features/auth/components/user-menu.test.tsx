import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";

const signOut = vi.fn(async () => {});
vi.mock("@/features/session/use-sign-out", () => ({
  useSignOut: () => ({ signOut, pending: false }),
}));
const { UserMenu } = await import("./user-menu");

const session = {
  state: "signed_in" as const,
  name: "Asha",
  initials: "AD",
  maskedContact: "+91 •••••• 4321",
  userTag: "tag",
  profiles: [],
  selectedProfileId: null,
  addressChip: null,
};

function open() {
  const button = screen.getByRole("button", { name: "Account menu for Asha" });
  fireEvent.pointerDown(button, { button: 0, ctrlKey: false, pointerType: "mouse" });
  return button;
}

describe("UserMenu", () => {
  it("shows initials only, never a photo", () => {
    const { container } = renderWithIntl(<UserMenu session={session} />);
    expect(screen.getByRole("button", { name: "Account menu for Asha" })).toHaveTextContent("AD");
    expect(container.querySelector("img")).toBeNull();
  });

  it("lists the first name, the masked contact and the signed-in links", async () => {
    renderWithIntl(<UserMenu session={session} />);
    open();
    expect(await screen.findByText("+91 •••••• 4321")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "My appointments" })).toHaveAttribute(
      "href",
      "/appointments",
    );
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("menuitem", { name: "Account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("menuitem", { name: "Support" })).toHaveAttribute("href", "/support");
    expect(document.body.textContent).not.toMatch(/9000004321|@example/);
  });

  it("signs out through the client sign-out sequence", async () => {
    renderWithIntl(<UserMenu session={session} />);
    open();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Log out" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
  });

  it("closes on Escape and returns focus to the button", async () => {
    renderWithIntl(<UserMenu session={session} />);
    const button = open();
    const menu = await screen.findByRole("menu");
    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });
});
