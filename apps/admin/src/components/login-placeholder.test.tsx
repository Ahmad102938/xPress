import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render";
import { LoginPlaceholder } from "./login-placeholder";

describe("LoginPlaceholder", () => {
  it("states that MFA will be required and collects no credentials", () => {
    const { container } = renderWithIntl(<LoginPlaceholder />);
    expect(screen.getByRole("heading", { level: 1, name: "Admin login" })).toBeInTheDocument();
    expect(screen.getByText(/Two-step verification will be required/)).toBeInTheDocument();
    expect(container.querySelector("input, form")).toBeNull();
  });
});
