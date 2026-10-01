import { describe, expect, it } from 'vitest';
import { isReverseTransition, getStageRank } from './transitions';

describe('transitions', () => {
  it('detects reverse transitions', () => {
    expect(isReverseTransition('In Review', 'In Progress')).toBe(true);
    expect(isReverseTransition('In Progress', 'Review')).toBe(false);
  });

  it('ranks stages consistently with legacy', () => {
    expect(getStageRank('To Do')).toBe(1);
    expect(getStageRank('In Progress')).toBe(2);
    expect(getStageRank('Review')).toBe(3);
    expect(getStageRank('Done')).toBe(4);
  });
});
