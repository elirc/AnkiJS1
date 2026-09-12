import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { captureNote } from '../../db/repos/noteRepo';
import { db, resetDatabaseForTests } from '../../db/schema';
import { InboxScreen } from './InboxScreen';

function renderInbox() {
  return render(
    <MemoryRouter>
      <InboxScreen />
    </MemoryRouter>,
  );
}

describe('InboxScreen', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('shows the empty state when the inbox is clear', async () => {
    renderInbox();
    expect(await screen.findByText(/No notes in the inbox/i)).toBeInTheDocument();
  });

  it('asks before deleting a note and deletes only after confirmation', async () => {
    const user = userEvent.setup();
    const note = await captureNote('A note to remove.');
    renderInbox();

    await user.click(await screen.findByRole('button', { name: /^Delete$/ }));
    const dialog = screen.getByRole('dialog', { name: /Delete this note/ });
    expect(dialog).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect((await db.notes.get(note.id))?.deleted_at).toBeNull();

    await user.click(screen.getByRole('button', { name: /^Delete$/ }));
    await user.click(screen.getByRole('button', { name: 'Delete note' }));
    await waitFor(async () => expect((await db.notes.get(note.id))?.deleted_at).not.toBeNull());
    expect(await screen.findByText(/No notes in the inbox/i)).toBeInTheDocument();
  });

  it('lists a captured note and archives it out of the inbox', async () => {
    const user = userEvent.setup();
    await captureNote('Spaced repetition beats cramming.');
    renderInbox();

    expect(await screen.findByText('Spaced repetition beats cramming.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Archive/i }));

    await waitFor(() => expect(screen.queryByText('Spaced repetition beats cramming.')).not.toBeInTheDocument());
    expect(await screen.findByText(/No notes in the inbox/i)).toBeInTheDocument();
    expect((await db.notes.toArray())[0]?.status).toBe('archived');
  });

  it('edits a note body inline', async () => {
    const user = userEvent.setup();
    const note = await captureNote('typo herre');
    renderInbox();

    await user.click(await screen.findByText('typo herre'));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'typo fixed');
    await user.click(screen.getByRole('button', { name: /Save note/i }));

    await waitFor(async () => expect((await db.notes.get(note.id))?.body).toBe('typo fixed'));
  });
});
