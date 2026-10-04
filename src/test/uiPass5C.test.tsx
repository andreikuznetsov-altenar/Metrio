// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('UI pass 5C — feedback empty states', () => {
  it('defines centered feedback empty state surface styles', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, '../pages/feedback/feedback-ds.css'),
      'utf8',
    );
    expect(css).toContain('.feedback-empty-state__card');
    expect(css).toContain('.ds-feedback-content');
    expect(css).toMatch(/max-width:\s*1280px/);
  });

  it('exports disconnected panel test ids for production route', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../pages/feedback/FeedbackDisconnectedPanels.tsx'),
      'utf8',
    );
    expect(source).toContain('feedback-survey-disconnected');
    expect(source).toContain('feedback-delivery-disconnected');
    expect(source).toContain('feedback-results-disconnected');
    expect(source).not.toContain('ds-feedback-empty-inline');
  });
});
