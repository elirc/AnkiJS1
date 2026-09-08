import { describe, expect, it } from 'vitest';
import { getAnswerPages, teachingMarker } from './answers';

describe('source credits on explicit lessons', () => {
  it('keeps attribution available independently of the selected explanation', () => {
    const back = `${teachingMarker}\n\n## The concept\n\nA concept.\n\n## Worked example\n\nAn example.\n\n---\nAdapted from [Source](https://example.com).`;
    const result = getAnswerPages('Question', back);
    expect(result.pages).toEqual([
      { title: 'The concept', body: 'A concept.' },
      { title: 'Worked example', body: 'An example.' },
    ]);
    expect(result.credit).toBe('Adapted from [Source](https://example.com).');
  });

  it('preserves ordinary page content when there is no source footer', () => {
    const result = getAnswerPages('Question', `${teachingMarker}\n\n## The answer\n\nOriginal explanation.`);
    expect(result.pages).toEqual([{ title: 'The answer', body: 'Original explanation.' }]);
    expect(result.credit).toBe('');
  });
});
