import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { OtpStep } from "./otp-step";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function setup(props: Partial<React.ComponentProps<typeof OtpStep>> = {}) {
  const onVerify = vi.fn();
  const onResend = vi.fn();
  renderWithIntl(
    <OtpStep
      maskedDestination="+91 98XXXXXX10"
      onVerify={onVerify}
      onResend={onResend}
      pending={false}
      error={null}
      {...props}
    />,
  );
  return { onVerify, onResend, input: screen.getByLabelText("6-digit code") };
}

describe("OtpStep", () => {
  it("shows the masked destination and a one-time-code field", () => {
    const { input } = setup();
    expect(screen.getByText(/We sent a 6-digit code to \+91 98XXXXXX10/)).toBeInTheDocument();
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
  });

  it("auto-submits a pasted 6-digit code once", () => {
    const { onVerify, input } = setup();
    fireEvent.change(input, { target: { value: "12 34 56" } });
    expect(onVerify).toHaveBeenCalledTimes(1);
    expect(onVerify).toHaveBeenCalledWith("123456");
    fireEvent.click(screen.getByRole("button", { name: "Verify code" }));
    expect(onVerify).toHaveBeenCalledTimes(1);
  });

  it("submits a code autofilled while the previous request is still pending (regression)", () => {
    const { onVerify, input } = setup({ pending: true });
    fireEvent.change(input, { target: { value: "654321" } });
    expect(onVerify).toHaveBeenCalledWith("654321");
  });

  it("keeps Verify disabled until six digits are entered", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "123" } });
    expect(screen.getByRole("button", { name: "Verify code" })).toBeDisabled();
  });

  it("offers a new code only after 30 seconds", () => {
    const { onResend } = setup();
    expect(screen.getByText(/You can ask for a new code in 30 s/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send a new code" })).not.toBeInTheDocument();
    for (let i = 0; i < 30; i += 1) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));
    expect(onResend).toHaveBeenCalledOnce();
  });

  it("shows one message for a wrong or expired code", () => {
    setup({ error: "invalid_or_expired" });
    expect(screen.getByRole("alert")).toHaveTextContent("That code is wrong or has expired.");
  });

  it.each([
    ["too_many_attempts", "Too many tries for this code."],
    ["network_error", "You seem to be offline."],
    ["captcha_failed", "We could not complete the security check."],
    ["method_disabled", "This sign-in option is not available right now."],
    ["unavailable", "Something went wrong on our side."],
  ])("explains %s", (error, text) => {
    setup({ error });
    expect(screen.getByRole("alert")).toHaveTextContent(text);
  });
});
