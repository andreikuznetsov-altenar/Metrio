import { describe, expect, it } from 'vitest';
import { getInitials } from './avatar';

describe('getInitials', () => {
  it('derives initials from full display name', () => {
    expect(getInitials('Andrei Kuznetsov')).toBe('AK');
  });

  it('uses first two letters for single token names', () => {
    expect(getInitials('Andrei')).toBe('AN');
  });

  it('returns fallback for empty input', () => {
    expect(getInitials('   ')).toBe('?');
  });
});
