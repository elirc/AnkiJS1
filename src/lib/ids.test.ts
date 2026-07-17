import { describe, expect, it } from 'vitest';
import { createId } from './ids';

describe('createId', () => {
  it('returns an RFC 4122 style uuid', () => {
    expect(createId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('returns a unique value on every call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()));
    expect(ids.size).toBe(100);
  });
});
