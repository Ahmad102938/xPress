import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sheet, SheetContent } from "@acurexpress/ui";
import { renderWithIntl } from "@/test/render";

// Multi-step flows run several transitions; give each wait 3 s so a busy CI machine is not flaky.
const slow = { timeout: 3000 };

const actions = vi.hoisted(() => ({
  sendPhoneOtp: vi.fn(),
  sendEmailOtp: vi.fn(),
  verifyOtp: vi.fn(),
  finishSignup: vi.fn(),
  completeStepUp: vi.fn(),
  sendStepUpEmailOtp: vi.fn(),
  verifyStepUpEmail: vi.fn(),
  stepUpOptions: vi.fn(),
  startGoogle: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("../actions", () => actions);

const { LoginPanel } = await import("./login-panel");

function renderPanel(
  props: Partial<React.ComponentProps<typeof LoginPanel>> = {},
  locale: "en" | "hi" = "en",
) {
  const onSignedIn = vi.fn();
  renderWithIntl(
    <LoginPanel
      variant="page"
      methods={["phone", "email", "google"]}
      start="start"
      next="/account"
      onSignedIn={onSignedIn}
      {...props}
    />,
    { locale },
  );
  return { onSignedIn };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginPanel: methods follow AUTH_METHODS", () => {
  it("shows phone first, with email and Google as alternatives", () => {
    renderPanel();
    expect(screen.getByLabelText("Mobile number")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use email instead" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("starts with email when phone is off (deployed default)", () => {
    renderPanel({ methods: ["email", "google"] });
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.queryByLabelText("Mobile number")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Use mobile number instead" }),
    ).not.toBeInTheDocument();
  });

  it("shows only Google when it is the only method", () => {
    renderPanel({ methods: ["google"] });
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("says sign-in is not open when no method is enabled (production placeholder legal versions)", () => {
    renderPanel({ methods: [] });
    expect(screen.getByRole("status")).toHaveTextContent("Sign-in is not open yet.");
  });

  it("shows an unavailable notice without Supabase env", () => {
    renderPanel({ unavailable: true });
    expect(screen.getByRole("status")).toHaveTextContent("Sign-in is not available right now.");
  });

  it("has no checkbox on the first screen", () => {
    renderPanel();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

describe("LoginPanel: phone flow to Finish sign-up", () => {
  it("sends, verifies, finishes and reports success", async () => {
    actions.sendPhoneOtp.mockResolvedValue({ ok: true });
    actions.verifyOtp.mockResolvedValue({ ok: true, state: "needs_finish" });
    actions.finishSignup.mockResolvedValue({ ok: true, state: "signed_in" });
    const { onSignedIn } = renderPanel();

    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText(/\+91 •••••• 3210/, undefined, slow)).toBeInTheDocument();
    expect(actions.sendPhoneOtp).toHaveBeenCalledWith({ phone: "+919876543210" });

    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "123456" } });
    expect(
      await screen.findByRole("heading", { name: "Finish sign-up" }, slow),
    ).toBeInTheDocument();
    expect(actions.verifyOtp).toHaveBeenCalledWith({
      channel: "phone",
      destination: "+919876543210",
      code: "123456",
    });

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Devi" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I am 18 or older/ }));
    fireEvent.click(screen.getByRole("button", { name: "Finish sign-up" }));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledOnce(), slow);
  });

  it("closes straight away for a returning patient", async () => {
    actions.sendEmailOtp.mockResolvedValue({ ok: true });
    actions.verifyOtp.mockResolvedValue({ ok: true, state: "signed_in" });
    const { onSignedIn } = renderPanel({ methods: ["email"] });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "a@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(await screen.findByLabelText("6-digit code", undefined, slow), {
      target: { value: "123456" },
    });
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledOnce());
    expect(screen.queryByRole("heading", { name: "Finish sign-up" })).not.toBeInTheDocument();
  });

  it("stays on the code step with the error after a wrong code", async () => {
    actions.sendEmailOtp.mockResolvedValue({ ok: true });
    actions.verifyOtp.mockResolvedValue({ ok: false, error: "invalid_or_expired" });
    renderPanel({ methods: ["email"] });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "a@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(await screen.findByLabelText("6-digit code", undefined, slow), {
      target: { value: "000000" },
    });
    expect(await screen.findByText(/That code is wrong or has expired/)).toBeInTheDocument();
    expect(screen.getByLabelText("6-digit code")).toHaveValue("");
  });

  it("shows a send error from the server on the same step", async () => {
    actions.sendPhoneOtp.mockResolvedValue({ ok: false, error: "rate_limited" });
    renderPanel();
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText(/Too many requests/)).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile number")).toBeInTheDocument();
  });
});

describe("LoginPanel: gate starts", () => {
  it("opens at Finish sign-up for a blocked user", () => {
    renderPanel({ start: "finish" });
    expect(screen.getByRole("heading", { name: "Finish sign-up" })).toBeInTheDocument();
  });

  it("opens at step-up and loads the account's options", async () => {
    actions.stepUpOptions.mockResolvedValue({ maskedEmail: null, google: false });
    actions.completeStepUp.mockResolvedValue({ ok: true, state: "signed_in" });
    const { onSignedIn } = renderPanel({ start: "step_up" });
    fireEvent.click(await screen.findByRole("button", { name: "Yes, this is my account" }));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledOnce());
  });

  it("goes to Google's URL from the Google button", async () => {
    actions.startGoogle.mockResolvedValue({ ok: false, error: "method_disabled" });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(actions.startGoogle).toHaveBeenCalledWith({ next: "/account" }));
    expect(await screen.findByText(/This sign-in option is not available/)).toBeInTheDocument();
  });
});

describe("LoginPanel in the drawer", () => {
  it("names the dialog with the step title and closes with the close button", () => {
    renderWithIntl(
      <Sheet open>
        <SheetContent closeLabel="Close" hideClose>
          <LoginPanel
            variant="drawer"
            methods={["phone"]}
            start="start"
            next="/"
            onSignedIn={() => {}}
          />
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("dialog", { name: "Log in or sign up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("renders in Hindi", () => {
    renderPanel({}, "hi");
    expect(screen.getByRole("heading", { name: "लॉग इन या साइन अप करें" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Google से जारी रखें" })).toBeInTheDocument();
  });
});
