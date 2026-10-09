import { describe, expect, it } from 'vitest';
import { formatPdfSafePath } from './teamPdfPath';

describe('formatPdfSafePath', () => {
  it('replaces Unicode arrows and backflow with ASCII-safe text', () => {
    const raw = 'To Do \u2192 In Progress \u2192 Review \u21A9 To Do';
    expect(formatPdfSafePath(raw)).toBe('To Do -> In Progress -> Review (backflow) To Do');
  });
});
