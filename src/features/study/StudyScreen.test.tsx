import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createCard } from '../../db/repos/cardRepo';
import { createDeck } from '../../db/repos/deckRepo';
import { db, resetDatabaseForTests } from '../../db/schema';
import { StudyScreen } from './StudyScreen';

describe('StudyScreen', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('reveals and rates a card', async () => {
    const user = userEvent.setup();
    const deck = await createDeck('Core');
    await createCard({ deck_id: deck.id, front: 'Question', back: 'Answer' });
    render(
      <MemoryRouter initialEntries={['/study']}>
        <Routes>
          <Route path="/study" element={<StudyScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Question')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show answer' }));
    expect(await screen.findByText('Answer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Good/ }));
    await waitFor(async () => expect(await db.review_logs.count()).toBe(1));
  });
});
