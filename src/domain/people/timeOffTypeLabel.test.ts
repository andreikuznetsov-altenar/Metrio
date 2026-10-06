import { describe, expect, it } from 'vitest';
import { formatBambooTimeOffType } from './timeOffTypeLabel';

describe('formatBambooTimeOffType', () => {
  it('preserves Bamboo type labels', () => {
    expect(formatBambooTimeOffType('Vacation')).toBe('Vacation');
    expect(formatBambooTimeOffType('Sick leave')).toBe('Sick Leave');
    expect(formatBambooTimeOffType('')).toBe('Time off');
  });
});
