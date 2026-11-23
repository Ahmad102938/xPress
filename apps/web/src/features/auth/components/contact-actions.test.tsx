import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";

const actions = vi.hoisted(() => ({
  addPhone: vi.fn(),
  verifyAddPhone: vi.fn(),
  addEmail: vi.fn(),
  verifyAddEmail: vi.fn(),
  connectGoogle: vi.fn(),
  setMarketing: vi.fn(),
}));
vi.mock("../actions", () => actions);
const refresh = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));

const { ContactActions } = await import("./contact-actions");

// Multi-step flows run several transitions; 3 s waits keep a busy machine from flaking.
const slow = { timeout: 3000 };

const base = {
  phone: null,
  email: "a@example.test",
  googleConnected: false,
  googleEnabled: true,
  marketing: false,
  initialResult: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ContactActions", () => {
  it("lists contacts and offers what is missing", () => {
    renderWithIntl(<ContactActions {...base} />);
    expect(screen.getByText("a@example.test")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add mobile number" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add email" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Google" })).toBeInTheDocument();
  });

  it("adds a phone after the code (CUJ 6)", async () => {
    actions.addPhone.mockResolvedValue({ ok: true });
    actions.verifyAddPhone.mockResolvedValue({ ok: true });
    renderWithIntl(<ContactActions {...base} />);
    fireEvent.click(screen.getByRole("button", { name: "Add mobile number" }));
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "9000000002" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    const code = await screen.findByLabelText(
      /Enter the 6-digit code we sent to \+91 90XXXXXX02/,
      undefined,
      slow,
    );
    fireEvent.change(code, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify code" }));
    expect(await screen.findByRole("status", undefined, slow)).toHaveTextContent(
      "Mobile number added.",
    );
    expect(actions.verifyAddPhone).toHaveBeenCalledWith({ phone: "+919000000002", code: "123456" });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows 'already in use' before any code (accepted v1 limitation)", async () => {
    actions.addPhone.mockResolvedValue({ ok: false, error: "in_use_phone" });
    renderWithIntl(<ContactActions {...base} />);
    fireEvent.click(screen.getByRole("button", { name: "Add mobile number" }));
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "9000000002" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByRole("alert", undefined, slow)).toHaveTextContent(
      "This number is already in use.",
    );
  });

  it("explains an email that is already in use (CUJ 7)", async () => {
    actions.addEmail.mockResolvedValue({ ok: false, error: "in_use_email" });
    renderWithIntl(<ContactActions {...base} email={null} phone="+919000000001" />);
    fireEvent.click(screen.getByRole("button", { name: "Add email" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "b@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByRole("alert", undefined, slow)).toHaveTextContent(
      "This email is already in use. Log in with it, or use a different email.",
    );
  });

  it.each([
    ["google", "Google is connected."],
    ["in_use_google", "This Google account is already in use."],
    ["cancelled", "Nothing was changed."],
  ])("shows the Google callback result %s", (result, text) => {
    renderWithIntl(<ContactActions {...base} initialResult={result} />);
    expect(screen.getByText(new RegExp(text))).toBeInTheDocument();
  });

  it("saves the marketing choice", async () => {
    actions.setMarketing.mockResolvedValue({ ok: true });
    renderWithIntl(<ContactActions {...base} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Send me health tips and offers" }));
    await waitFor(() => expect(actions.setMarketing).toHaveBeenCalledWith({ granted: true }));
    expect(await screen.findByText("Your choice is saved.")).toBeInTheDocument();
  });

  it("renders in Hindi", () => {
    renderWithIntl(<ContactActions {...base} />, { locale: "hi" });
    expect(screen.getByRole("button", { name: "मोबाइल नंबर जोड़ें" })).toBeInTheDocument();
  });
});
