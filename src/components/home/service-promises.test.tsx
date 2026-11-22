import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseFlags } from "@/lib/flags";
import { renderWithIntl } from "@/test/render";
import { ServicePromises } from "./service-promises";

describe("ServicePromises", () => {
  it("shows only promises that are true today when medicine sales are off", () => {
    renderWithIntl(<ServicePromises flags={parseFlags({})} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Verified doctors")).toBeInTheDocument();
    expect(screen.queryByText("Free delivery")).toBeNull();
  });

  it("keeps commerce promises hidden until HCQ confirms them, even with the flag on", () => {
    renderWithIntl(<ServicePromises flags={parseFlags({ FLAG_MEDICINE_SALES: "true" })} />);
    expect(screen.queryByText("Free delivery")).toBeNull();
    expect(screen.queryByText(/guaranteed/i)).toBeNull();
  });
});
