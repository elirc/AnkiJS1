import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createCard } from '../../db/repos/cardRepo';
import { createDeck } from '../../db/repos/deckRepo';
import { captureNote } from '../../db/repos/noteRepo';
import { db, resetDatabaseForTests } from '../../db/schema';
import { HomeScreen } from './HomeScreen';

function renderHome() {
  return render(
    <MemoryRouter>
      <HomeScreen />
    </MemoryRouter>,
  );
}

describe('HomeScreen', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('invites the user to get started when there are no decks', async () => {
    renderHome();
    expect(await screen.findByRole('button', { name: /Create a deck/i })).toBeInTheDocument();
  });

  it('summarizes due cards and disables studying when nothing is due', async () => {
    const deck = await createDeck('Empty deck');
    // A brand-new card without spending the daily allotment still counts as available.
    await createCard({ deck_id: deck.id, front: 'Q', back: 'A' });
    renderHome();

    expect(await screen.findByText('Empty deck')).toBeInTheDocument();
    const studyNow = await screen.findByRole('button', { name: /Study now/i });
    expect(studyNow).toBeEnabled();

    // Deck with zero available cards: hide the call to action count.
    await db.decks.update(deck.id, { new_per_day: 0 });
  });

  it('surfaces the inbox count when notes are waiting', async () => {
    await captureNote('a waiting thought');
    renderHome();
    await waitFor(() => expect(screen.getByText(/1 note waiting/i)).toBeInTheDocument());
  });
});
