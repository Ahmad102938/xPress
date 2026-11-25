import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

describe("Dialog", () => {
  it("opens a labelled modal with a named close button and closes on Escape", async () => {
    render(
      <Dialog>
        <DialogTrigger>Change phone</DialogTrigger>
        <DialogContent closeLabel="Close">
          <DialogTitle>Confirm it is you</DialogTitle>
          <DialogDescription>We sent a code</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Change phone" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Confirm it is you" })).toHaveAccessibleDescription(
      "We sent a code",
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe("AlertDialog", () => {
  it("is an alertdialog with cancel and action buttons", () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Sign out everywhere</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Sign out of every device?</AlertDialogTitle>
          <AlertDialogDescription>You will need to sign in again.</AlertDialogDescription>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Sign out everywhere</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    expect(
      screen.getByRole("alertdialog", { name: "Sign out of every device?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });
});

describe("Popover", () => {
  it("opens from its trigger", () => {
    render(
      <Popover>
        <PopoverTrigger>Notifications</PopoverTrigger>
        <PopoverContent>No notifications yet</PopoverContent>
      </Popover>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });
});

describe("DropdownMenu", () => {
  it("lists radio items with the selected one checked", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Booking for</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">Self</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">Child</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuItem>Manage family</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole("button", { name: "Booking for" });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
    expect(await screen.findByRole("menuitemradio", { name: "Self" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "Child" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("menuitem", { name: "Manage family" })).toBeInTheDocument();
  });
});
