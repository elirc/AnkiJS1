import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateToast } from "./UpdateToast";
import { notifyAppUpdate } from "../lib/appUpdate";

it("shows an update that arrived before the app mounted, and lets the user reload", async () => {
  const first = render(<UpdateToast />);
  expect(screen.queryByText("Update available")).not.toBeInTheDocument();
  first.unmount();
  notifyAppUpdate();
  render(<UpdateToast />);
  expect(screen.getByText("Update available")).toBeVisible();
  const apply = vi.fn();
  window.addEventListener("recall:apply-update", apply);
  try {
    await userEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(apply).toHaveBeenCalledOnce();
  } finally {
    window.removeEventListener("recall:apply-update", apply);
  }
});
