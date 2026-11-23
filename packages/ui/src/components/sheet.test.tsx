import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./sheet";

function Example() {
  return (
    <Sheet>
      <SheetTrigger>Open panel</SheetTrigger>
      <SheetContent closeLabel="Close panel">
        <SheetTitle>Log in</SheetTitle>
        <SheetDescription>Enter your phone number</SheetDescription>
        <input aria-label="Phone number" />
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("opens as a labelled modal dialog", () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    const dialog = screen.getByRole("dialog", { name: "Log in" });
    expect(dialog).toHaveAccessibleDescription("Enter your phone number");
    expect(screen.getByRole("button", { name: "Close panel" })).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open panel" });
    trigger.focus(); // a real click focuses the button; fireEvent.click does not
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Radix restores focus on a zero-delay timer after the dialog unmounts.
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes with the labelled close button", () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
