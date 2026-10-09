import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');

function readCss(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

function blockUsesHorizontalCardGap(css: string, selector: string): boolean {
  const escaped = selector.replace(/\./g, '\\.');
  const className = selector.replace(/^\./, '');
  const match = css.match(
    new RegExp(`${escaped}(?![a-z0-9_-])\\s*\\{([^}]+)\\}`, 's'),
  );
  if (!match) return false;
  const body = match[1];
  return (
    /column-gap:\s*var\(--space-2\)/.test(body)
    || (/gap:\s*var\(--space-2\)/.test(body) && !/column-gap:\s*var\(--space-3\)/.test(body))
  );
}

describe('PASS 16.1 sibling card horizontal gap', () => {
  it('dashboard KPI strip uses --space-2 column gap', () => {
    const css = readCss('pages/home/dashboard/executive-dashboard.css');
    expect(blockUsesHorizontalCardGap(css, '.executive-kpi-strip')).toBe(true);
  });

  it('dashboard recommendation pair uses --space-2 column gap', () => {
    const css = readCss('pages/home/dashboard/executive-dashboard-pass10.css');
    expect(blockUsesHorizontalCardGap(css, '.executive-lower-three')).toBe(true);
    expect(blockUsesHorizontalCardGap(css, '.executive-recommendations__list')).toBe(true);
  });

  it('performance overview metric grids use --space-2 column gap', () => {
    const css = readCss('pages/performance/performance-dashboard.css');
    expect(blockUsesHorizontalCardGap(css, '.performance-metrics')).toBe(true);
    expect(blockUsesHorizontalCardGap(css, '.performance-trends')).toBe(true);
  });

  it('goals card grid uses --space-2 column gap', () => {
    const css = readCss('pages/performance/goal-detail-drawer.css');
    expect(blockUsesHorizontalCardGap(css, '.goal-card-grid')).toBe(true);
  });

  it('documents shared utility class', () => {
    const css = readCss('styles/design-system.css');
    expect(css).toContain('.metrio-sibling-card-gap');
    expect(css).toMatch(/\.metrio-sibling-card-gap[\s\S]*column-gap:\s*var\(--space-2\)/);
  });
});
