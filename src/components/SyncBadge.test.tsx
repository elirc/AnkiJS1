import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SyncBadge } from "./SyncBadge";

describe("SyncBadge", () => {
  it("mounts without crashing and shows the local-only label", async () => {
    // No test previously mounted SyncBadge, which let an infinite
    // useSyncExternalStore re-render ship and blank the whole app.
    render(<SyncBadge />);
    expect(await screen.findByText("Saved on this device")).toBeInTheDocument();
    expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
  });
});
