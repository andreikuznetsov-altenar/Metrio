import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Metrics Methodology V2 guard: the pre-V2 Efficiency Index and the ambiguous `backflowCount`
 * may only exist in explicitly legacy / parity code. Production code must use
 * `reworkedCycleCount` / `backflowEventCount` and never present an Efficiency score.
 */
const SRC = join(__dirname, '..');
const ALLOWED_DIRS = ['domain/legacy/', 'domain/parity/'];
const FORBIDDEN: Array<{ name: string; pattern: RegExp }> = [
  { name: 'efficiencyIndex', pattern: /\befficiencyIndex\b/ },
  { name: 'backflowCount', pattern: /\bbackflowCount\b/ },
  { name: 'canonicalTeamEfficiency', pattern: /canonicalTeamEfficiency|resolveCanonicalTeamEfficiency|teamEfficiency/ },
  { name: 'excludeFromEfficiencyBackflow', pattern: /excludeFromEfficiencyBackflow/ },
  { name: 'efficiency metric', pattern: /metric:\s*["']efficiency["']|["']efficiency["']\s*:/ },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|css)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('Metrics V2 legacy boundary', () => {
  const files = walk(SRC)
    .map((file) => ({ file, rel: relative(SRC, file).replace(/\\/g, '/') }))
    .filter(({ rel }) => !ALLOWED_DIRS.some((dir) => rel.startsWith(dir)));

  for (const { name, pattern } of FORBIDDEN) {
    it(`production code does not reference ${name}`, () => {
      const hits = files
        .filter(({ file }) => pattern.test(readFileSync(file, 'utf8')))
        .map(({ rel }) => rel);
      // Legacy KPI shape is isolated in domain/legacy; snapshots keep one legacy v1 migration type.
      expect(hits.filter((rel) => rel !== 'domain/snapshots/types.ts')).toEqual([]);
    });
  }
});
