import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InlineScript } from "./inline-script";

describe("InlineScript", () => {
  it("is inert when React renders it in the browser (no 'script tag' warning on soft navigation)", () => {
    const { container } = render(<InlineScript html="window.__ran = true" />);
    const script = container.querySelector("script");
    expect(script).toHaveAttribute("type", "text/plain");
    expect(script?.innerHTML).toBe("window.__ran = true");
  });
});

describe("InlineScript nonce", () => {
  it("renders the nonce when one is given", () => {
    const { container } = render(<InlineScript html="1" nonce="abc123" />);
    expect(container.querySelector("script")?.nonce).toBe("abc123");
  });

  it("has no nonce on public pages", () => {
    const { container } = render(<InlineScript html="1" />);
    expect(container.querySelector("script")?.hasAttribute("nonce")).toBe(false);
  });
});
