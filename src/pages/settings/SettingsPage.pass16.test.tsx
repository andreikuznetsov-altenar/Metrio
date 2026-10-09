// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Settings PASS 16', () => {
  it('does not render Google Calendar or Metrio shared services in connections UI source', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, 'SettingsPage.tsx'),
      'utf8',
    );
    expect(source).not.toContain('CalendarSettingsPanel');
    expect(source).not.toContain('MetrioCloudSettingsPanel');
    expect(source).not.toContain('Google Calendar');
  });
});
