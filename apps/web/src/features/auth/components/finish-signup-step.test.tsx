import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { FinishSignupStep } from "./finish-signup-step";

describe("FinishSignupStep", () => {
  it("starts with both boxes unticked and the submit disabled", () => {
    renderWithIntl(<FinishSignupStep onSubmit={() => {}} pending={false} error={null} />);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    for (const box of boxes) expect(box).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Finish sign-up" })).toBeDisabled();
  });

  it("links Terms and Privacy in a new tab", () => {
    renderWithIntl(<FinishSignupStep onSubmit={() => {}} pending={false} error={null} />);
    expect(screen.getByRole("link", { name: /Terms of use/ })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /Privacy policy/ })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("submits the trimmed name with marketing off by default", () => {
    const onSubmit = vi.fn();
    renderWithIntl(<FinishSignupStep onSubmit={onSubmit} pending={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "  Asha   Devi " } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I am 18 or older/ }));
    fireEvent.click(screen.getByRole("button", { name: "Finish sign-up" }));
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: "Asha Devi",
      marketing: false,
      acceptTerms: true,
    });
  });

  it("records an opted-in marketing choice", () => {
    const onSubmit = vi.fn();
    renderWithIntl(
      <FinishSignupStep onSubmit={onSubmit} pending={false} error={null} defaultName="Asha Devi" />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /I am 18 or older/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /health tips/ }));
    fireEvent.click(screen.getByRole("button", { name: "Finish sign-up" }));
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: "Asha Devi",
      marketing: true,
      acceptTerms: true,
    });
  });

  it("refuses a one-letter name", () => {
    const onSubmit = vi.fn();
    renderWithIntl(<FinishSignupStep onSubmit={onSubmit} pending={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I am 18 or older/ }));
    fireEvent.click(screen.getByRole("button", { name: "Finish sign-up" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "Enter your name using 2 to 80 letters.",
    );
  });

  it("renders in Hindi", () => {
    renderWithIntl(<FinishSignupStep onSubmit={() => {}} pending={false} error={null} />, {
      locale: "hi",
    });
    expect(screen.getByLabelText("पूरा नाम")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /उपयोग की शर्तों/ })).toBeInTheDocument();
  });
});
