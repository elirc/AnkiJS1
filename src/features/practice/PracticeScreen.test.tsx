import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { resetDatabaseForTests } from "../../db/schema";
import * as repo from "../../db/repos/practiceRepo";
import { engineeringMissions } from "../../data/engineering-missions";
import { PracticeScreen } from "./PracticeScreen";

const mission = engineeringMissions[0];
function openMission() {
  return render(<MemoryRouter initialEntries={[`/practice/${mission.id}`]}><Routes>
    <Route path="/practice/:missionId" element={<PracticeScreen />} />
  </Routes></MemoryRouter>);
}

describe("engineering mission workspace", () => {
  beforeEach(resetDatabaseForTests);

  it("saves fast edits, gates completion, and reopens completed work after remount", async () => {
    const view = openMission();
    const outcome = await screen.findByLabelText("What I changed");
    expect(screen.getByRole("button", { name: "Complete mission" })).toBeDisabled();
    fireEvent.change(outcome, { target: { value: "First draft" } });
    fireEvent.change(outcome, { target: { value: "Traced the capture action to its transaction." } });
    fireEvent.change(screen.getByLabelText("How I verified it"), { target: { value: "Saved offline and reloaded successfully." } });
    fireEvent.change(screen.getByLabelText("Tradeoff and next step"), { target: { value: "Sync is separate. Next check failure recovery." } });
    for (const check of mission.checks) fireEvent.click(screen.getByLabelText(check.label));
    await waitFor(() => expect(screen.getByRole("button", { name: "Complete mission" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Complete mission" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Reopen mission" })).toBeEnabled());
    expect((await repo.listPracticeEntries())[0]).toMatchObject({ completed: true, outcome: "Traced the capture action to its transaction." });
    view.unmount();
    openMission();
    expect(await screen.findByLabelText("What I changed")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reopen mission" }));
    await waitFor(() => expect(screen.getByLabelText("What I changed")).toBeEnabled());
    await waitFor(async () => expect((await repo.listPracticeEntries())[0].completed).toBe(false));
  });

  it("keeps the draft visible after a failed save and lets the user retry", async () => {
    vi.spyOn(repo, "savePracticeEntry").mockRejectedValueOnce(new Error("Storage full"));
    openMission();
    fireEvent.change(await screen.findByLabelText("What I changed"), { target: { value: "Keep my work after failure" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
    expect(screen.getByLabelText("What I changed")).toHaveValue("Keep my work after failure");
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    await waitFor(async () => expect((await repo.listPracticeEntries())[0]?.outcome).toBe("Keep my work after failure"));
  });
});
