import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createCard } from '../../db/repos/cardRepo';
import { createDeck } from '../../db/repos/deckRepo';
import { db, resetDatabaseForTests } from '../../db/schema';
import { CardEditorScreen } from './CardEditorScreen';

function renderEditor(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/cards/new" element={<CardEditorScreen />} />
        <Route path="/cards/:cardId/edit" element={<CardEditorScreen />} />
        <Route path="/decks/:deckId" element={<div>Deck page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CardEditorScreen', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('prompts to create a deck when none exist', async () => {
    renderEditor('/cards/new');
    expect(await screen.findByText(/Create a deck before adding cards/i)).toBeInTheDocument();
  });

  it('creates a new card and navigates back to the deck', async () => {
    const user = userEvent.setup();
    const deck = await createDeck('Biology');
    renderEditor(`/cards/new?deckId=${deck.id}`);

    await user.type(await screen.findByLabelText('Front'), 'What is ATP?');
    await user.type(screen.getByLabelText('Back'), 'The energy currency of the cell');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Deck page')).toBeInTheDocument());
    const cards = await db.cards.toArray();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ front: 'What is ATP?', deck_id: deck.id });
  });

  it('edits an existing card', async () => {
    const user = userEvent.setup();
    const deck = await createDeck('Biology');
    const card = await createCard({ deck_id: deck.id, front: 'Old front', back: 'Old back' });
    renderEditor(`/cards/${card.id}/edit`);

    const front = await screen.findByLabelText('Front');
    await waitFor(() => expect(front).toHaveValue('Old front'));
    await user.clear(front);
    await user.type(front, 'New front');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => expect((await db.cards.get(card.id))?.front).toBe('New front'));
  });
});
