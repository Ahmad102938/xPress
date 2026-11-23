import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { StepUpStep, type StepUpOptions } from "./step-up-step";

function setup(options: Partial<StepUpOptions>) {
  const handlers = {
    onSendEmail: vi.fn(),
    onGoogle: vi.fn(),
    onConfirmOwner: vi.fn(),
    onNotMine: vi.fn(),
  };
  renderWithIntl(
    <StepUpStep
      options={{
        maskedEmail: null,
        google: false,
        emailEnabled: true,
        googleEnabled: true,
        ...options,
      }}
      pending={false}
      error={null}
      {...handlers}
    />,
  );
  return handlers;
}

describe("StepUpStep", () => {
  it("offers a code to the masked account email and Google when the account has them", () => {
    const handlers = setup({ maskedEmail: "a•••@example.test", google: true });
    fireEvent.click(screen.getByRole("button", { name: "Send a code to a•••@example.test" }));
    expect(handlers.onSendEmail).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Confirm with Google" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Yes, this is my account" }),
    ).not.toBeInTheDocument();
  });

  it("asks a phone-only account whether it is theirs", () => {
    const handlers = setup({});
    expect(screen.getByText("Is this your account?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, this is my account" }));
    expect(handlers.onConfirmOwner).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "No, this is a new number" }));
    expect(handlers.onNotMine).toHaveBeenCalledOnce();
  });

  it("hides the email option when email codes are switched off", () => {
    setup({ maskedEmail: "a•••@example.test", emailEnabled: false, google: true });
    expect(screen.queryByRole("button", { name: /Send a code/ })).not.toBeInTheDocument();
  });
});
