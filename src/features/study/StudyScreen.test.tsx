import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import * as cardRepository from "../../db/repos/cardRepo";
import * as studyRepository from "../../db/repos/studyRepo";
import { createCard } from "../../db/repos/cardRepo";
import { createDeck } from "../../db/repos/deckRepo";
import { db, resetDatabaseForTests } from "../../db/schema";
import { StudyScreen } from "./StudyScreen";
import { teachingMarker } from "../../teaching/answers";

describe("StudyScreen", () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it.each(["saving the review", "refreshing the queue"])(
    "opens the next session immediately when navigating while %s",
    async (stage) => {
      const user = userEvent.setup();
      const first = await createDeck("First topic");
      const second = await createDeck("Second topic");
      const reviewedCard = await createCard({ deck_id: first.id, front: "First question", back: "First answer" });
      await createCard({ deck_id: second.id, front: "Second question", back: "Second answer" });
      render(
        <MemoryRouter initialEntries={[`/study/${first.id}?minutes=5`]}>
          <Link to={`/study/${second.id}?minutes=2`}>Switch topic</Link>
          <Routes><Route path="/study/:deckId" element={<StudyScreen />} /></Routes>
        </MemoryRouter>,
      );
      await user.click(await screen.findByRole("button", { name: "Show answer" }));
      let release!: () => void;
      let waiting = false;
      const paused = new Promise<void>((resolve) => { release = resolve; });
      if (stage === "saving the review") {
        const save = cardRepository.applyReview;
        vi.spyOn(cardRepository, "applyReview").mockImplementationOnce(async (...args) => {
          waiting = true;
          await paused;
          return save(...args);
        });
      } else {
        const read = studyRepository.loadStudy;
        vi.spyOn(studyRepository, "loadStudy").mockImplementationOnce(async (...args) => {
          waiting = true;
          await paused;
          return read(...args);
        });
      }
      await user.click(screen.getByRole("button", { name: /Easy/ }));
      await waitFor(() => expect(waiting).toBe(true));
      await user.click(screen.getByRole("link", { name: "Switch topic" }));
      await act(async () => { release(); });
      expect(await screen.findByText("Second question", {}, { timeout: 5000 })).toBeVisible();
      expect(screen.getByText("2-minute session · 0 reviewed")).toBeVisible();
      expect(screen.queryByText("First question")).not.toBeInTheDocument();
      expect((await db.review_logs.toArray()).map((log) => log.card_id)).toEqual([reviewedCard.id]);
    },
  );

  it("ignores a background queue read that began before the current review was saved", async () => {
    const user = userEvent.setup();
    const deck = await createDeck("Background refresh");
    const first = await createCard({ deck_id: deck.id, front: "First question", back: "First answer" });
    await db.cards.update(first.id, { created_at: "2020-01-01T00:00:00.000Z" });
    await createCard({ deck_id: deck.id, front: "Second question", back: "Second answer" });
    render(<MemoryRouter><StudyScreen /></MemoryRouter>);
    await screen.findByText("First question");
    let release!: () => void;
    let captured = false;
    const paused = new Promise<void>((resolve) => { release = resolve; });
    const read = studyRepository.loadStudy;
    let background: ReturnType<typeof read> | undefined;
    vi.spyOn(studyRepository, "loadStudy").mockImplementationOnce((...args) => {
      background = (async () => {
        const snapshot = await read(...args);
        captured = true;
        await paused;
        return snapshot;
      })();
      return background;
    });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(() => expect(captured).toBe(true));
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    await user.click(screen.getByRole("button", { name: /Easy/ }));
    await screen.findByText("Second question");
    await act(async () => { release(); await background; });
    expect(screen.getByText("Second question")).toBeVisible();
    expect(screen.queryByText("First question")).not.toBeInTheDocument();
    expect(await db.review_logs.count()).toBe(1);
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
    await screen.findByRole("heading", { name: "Session complete" }, { timeout: 5000 });
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
    await screen.findByRole("heading", { name: "Session complete" }, { timeout: 5000 });
    await waitFor(async () => expect(await db.review_logs.count()).toBe(1));
    expect((await db.cards.toArray())[0].reps).toBe(1);
  });
});
