import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("../actions", () => ({ signOut: vi.fn(), signOutAction: vi.fn() }));
vi.mock("@/features/profiles/actions", () => ({ selectProfile: vi.fn() }));
const { Link } = await import("@/i18n/navigation");
const { AuthProvider, useAuth } = await import("./auth-provider");
const { HeaderAuth } = await import("./header-auth");
const { AuthLinkInterceptor } = await import("./auth-link-interceptor");

function mockSession(state: string, extra: Record<string, unknown> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            state,
            name: null,
            initials: "",
            maskedContact: null,
            userTag: null,
            profiles: [],
            selectedProfileId: null,
            addressChip: null,
            ...extra,
          }),
        ),
    ),
  );
}

function OpenState() {
  const { isOpen, next, start } = useAuth();
  return <output data-testid="panel">{isOpen ? `open:${next}:${start}` : "closed"}</output>;
}

async function renderHeader() {
  await act(async () => {
    renderWithIntl(
      <AuthProvider methods={["phone", "email", "google"]}>
        <HeaderAuth />
        <Link href="/account">Profile link</Link>
        <Link href={{ pathname: "/login", query: { next: "/doctors" } }}>Book</Link>
        <AuthLinkInterceptor />
        <OpenState />
      </AuthProvider>,
    );
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("HeaderAuth", () => {
  it("shows the Login link for visitors", async () => {
    mockSession("signed_out");
    await renderHeader();
    expect(screen.getByRole("link", { name: /Login/ })).toHaveAttribute("href", "/login");
  });

  it("shows Finish sign-up for a user stopped at the gate", async () => {
    mockSession("needs_finish");
    await renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Finish sign-up" }));
    expect(screen.getByTestId("panel")).toHaveTextContent("open:/:finish");
  });

  it("shows the user menu when signed in", async () => {
    mockSession("signed_in", { name: "Asha Devi", initials: "AD" });
    await renderHeader();
    expect(screen.getByRole("button", { name: "Account menu for Asha Devi" })).toBeInTheDocument();
  });
});

describe("AuthLinkInterceptor", () => {
  it("opens the panel for /login?next= links with the sanitised return path", async () => {
    mockSession("signed_out");
    await renderHeader();
    fireEvent.click(screen.getByRole("link", { name: "Book" }));
    expect(screen.getByTestId("panel")).toHaveTextContent("open:/doctors:start");
  });

  it("opens the panel for protected links while signed out", async () => {
    mockSession("signed_out");
    await renderHeader();
    fireEvent.click(screen.getByRole("link", { name: "Profile link" }));
    expect(screen.getByTestId("panel")).toHaveTextContent("open:/account:start");
  });

  it("lets signed-in users navigate normally", async () => {
    mockSession("signed_in", { name: "Asha" });
    await renderHeader();
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    screen.getByRole("link", { name: "Profile link" }).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(screen.getByTestId("panel")).toHaveTextContent("closed");
  });

  it("opens from ?login=1 links and ignores unsafe return paths", async () => {
    window.history.replaceState(null, "", "/?login=1&next=%2F%2Fevil.com&step=finish");
    mockSession("signed_out");
    await renderHeader();
    expect(screen.getByTestId("panel")).toHaveTextContent("open:/:finish");
  });
});

describe("HeaderAuth on phones", () => {
  it("hides the signed-in menu below md (the bottom nav Account tab replaces it)", async () => {
    mockSession("signed_in", { name: "Asha Devi", initials: "AD" });
    await renderHeader();
    const menu = screen.getByRole("button", { name: "Account menu for Asha Devi" });
    expect(menu.closest("div.hidden")).toHaveClass("md:flex");
  });
});
