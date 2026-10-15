/**
 * The application clock. Production ALWAYS returns the real current time.
 *
 * It exists so surfaces that derive ages / countdowns / stale rules from "now" can be pinned to a
 * deterministic reference in fixture modes (documentation + presentation screenshots, visual tests)
 * through ONE dependency-injected source, without monkey-patching `Date` globally. Nothing in
 * production installs a fixed source.
 */

/** "Today" of the documentation fixture dataset (METRIO_DOC_FIXTURES). */
export const DOC_FIXTURE_NOW_ISO = "2026-10-10T09:30:00.000Z";
/** "Today" of the illustrative presentation dataset (installed only by the presentation build). */
export const PRESENTATION_FIXTURE_NOW_ISO = "2026-10-14T09:30:00.000Z";

type ClockSource = () => Date;

let source: ClockSource | null = null;

/**
 * "Today" of the Playwright visual suite. The browser clock itself is pinned to this instant by
 * `e2e/visual/baseTest.ts` (Playwright `page.clock`), so the app needs no special visual branch;
 * Node-side fixture serializers use the same constant so seeded timestamps agree with the page.
 */
export const VISUAL_FIXTURE_NOW_ISO = "2026-10-03T07:30:00.000Z";

/** Current application time (real time unless a fixture clock was installed). */
export function appNow(): Date {
  if (source) return source();
  return new Date();
}

/** Installs a clock source (fixture / test). Pass null to restore real time. */
export function setAppClock(next: ClockSource | null): void {
  source = next;
}

/** Pins the application clock to one fixed instant. */
export function setAppClockFixed(instant: Date | string): void {
  const fixed = new Date(typeof instant === "string" ? instant : instant.getTime());
  source = () => new Date(fixed.getTime());
}

export function isAppClockFixed(): boolean {
  return source !== null;
}
