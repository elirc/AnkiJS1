import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createCard } from "../../db/repos/cardRepo";
import { createDeck } from "../../db/repos/deckRepo";
import { db, resetDatabaseForTests } from "../../db/schema";
import { StudyScreen } from "./StudyScreen";
import { teachingMarker } from "../../teaching/answers";

describe("StudyScreen", () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it("explores explanations without recording a review, and resets after undo", async () => {
    const user = userEvent.setup();
    const deck = await createDeck("Beginner practice");
    const card = await createCard({
      deck_id: deck.id,
      front: "Explain this idea",
      back: `${teachingMarker}\n\n## Plain English\n\nThe basic idea.\n\n## An example\n\nA concrete example.`,
    });
    render(
      <MemoryRouter>
        <StudyScreen />
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole("button", { name: "Show answer" }),
    );
    await user.click(screen.getByRole("button", { name: "Next explanation" }));
    expect(screen.getByText("A concrete example.")).toBeInTheDocument();
    expect(await db.review_logs.count()).toBe(0);
    expect((await db.cards.get(card.id))?.reps).toBe(0);
    await user.click(screen.getByRole("button", { name: /Easy/ }));
    await screen.findByRole(
      "heading",
      { name: "Session complete" },
      { timeout: 5000 },
    );
    expect(await db.review_logs.count()).toBe(1);
    await user.click(screen.getByRole("button", { name: "Undo last review" }));
    await user.click(
      await screen.findByRole("button", { name: "Show answer" }),
    );
    expect(screen.getByText("The basic idea.")).toBeInTheDocument();
    expect(screen.getByLabelText("Explanation style")).toHaveValue("0");
    expect(await db.review_logs.count()).toBe(0);
  });

  it("reveals and rates a card", async () => {
    const user = userEvent.setup();
    const deck = await createDeck("Core");
    await createCard({ deck_id: deck.id, front: "Question", back: "Answer" });
    render(
      <MemoryRouter initialEntries={["/study"]}>
        <Routes>
          <Route path="/study" element={<StudyScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Question")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    expect(await screen.findByText("Answer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Good/ }));
    await waitFor(async () => expect(await db.review_logs.count()).toBe(1));
  });

  it("does not review learning cards before they are due and can undo the last card", async () => {
    const user = userEvent.setup();
    const deck = await createDeck("Core");
    await createCard({
      deck_id: deck.id,
      front: "Only question",
      back: "Only answer",
    });
    render(
      <MemoryRouter>
        <StudyScreen />
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole("button", { name: "Show answer" }),
    );
    await user.click(screen.getByRole("button", { name: /Again/ }));
    expect(
      await screen.findByRole("heading", { name: "Session complete" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Only question")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo last review" }));
    expect(await screen.findByText("Only question")).toBeInTheDocument();
    expect(await db.review_logs.count()).toBe(0);
  });

  it("ignores repeated rating clicks while a save is in flight", async () => {
    const user = userEvent.setup();
    const deck = await createDeck("Core");
    await createCard({ deck_id: deck.id, front: "Question", back: "Answer" });
    render(
      <MemoryRouter>
        <StudyScreen />
      </MemoryRouter>,
    );
    await user.click(
      await screen.findByRole("button", { name: "Show answer" }),
    );
    await user.dblClick(screen.getByRole("button", { name: /Easy/ }));
    await waitFor(async () => expect(await db.review_logs.count()).toBe(1));
    expect((await db.cards.toArray())[0].reps).toBe(1);
  });
});
