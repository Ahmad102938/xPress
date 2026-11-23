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
