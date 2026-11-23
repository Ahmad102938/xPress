import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import { PhoneStep } from "./phone-step";

describe("PhoneStep", () => {
  it("shows a labelled +91 field and a Continue button", () => {
    renderWithIntl(<PhoneStep onSubmit={() => {}} pending={false} error={null} />);
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByText("+91")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("submits the normalised number", () => {
    const onSubmit = vi.fn();
    renderWithIntl(<PhoneStep onSubmit={onSubmit} pending={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "98765 43210" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith("+919876543210");
  });

  it("explains an invalid number on blur and does not submit it", () => {
    const onSubmit = vi.fn();
    renderWithIntl(<PhoneStep onSubmit={onSubmit} pending={false} error={null} />);
    const input = screen.getByLabelText("Mobile number");
    fireEvent.change(input, { target: { value: "12345" } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a 10-digit Indian mobile number.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the error as soon as the user types", () => {
    renderWithIntl(<PhoneStep onSubmit={() => {}} pending={false} error={null} />);
    const input = screen.getByLabelText("Mobile number");
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "98" } });
    expect(screen.getByRole("alert")).toHaveTextContent("");
  });

  it("shows a server error and disables the button while sending", () => {
    renderWithIntl(<PhoneStep onSubmit={() => {}} pending error="rate_limited" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests.");
    expect(screen.getByRole("button", { name: /Sending code/ })).toBeDisabled();
  });

  it("renders in Hindi", () => {
    renderWithIntl(<PhoneStep onSubmit={() => {}} pending={false} error={null} />, {
      locale: "hi",
    });
    expect(screen.getByLabelText("मोबाइल नंबर")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "आगे बढ़ें" })).toBeInTheDocument();
  });
});
