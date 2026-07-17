import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { db, resetDatabaseForTests } from '../../db/schema';
import { CaptureScreen } from './CaptureScreen';

describe('CaptureScreen', () => {
  beforeEach(async () => {
    await resetDatabaseForTests();
  });

  it('saves a note and clears the textarea', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CaptureScreen />
      </MemoryRouter>,
    );
    const textarea = screen.getByLabelText('Capture note');
    await user.type(textarea, 'Remember the Feynman technique.');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(textarea).toHaveValue(''));
    expect(await db.notes.count()).toBe(1);
  });
});
