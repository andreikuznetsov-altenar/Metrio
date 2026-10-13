import { test as base } from "@playwright/test";

/**
 * Visual snapshots embed dates, relative ages and the time-of-day greeting. Without a pinned
 * clock they only match on the day (and hour band) they were recorded. Every page starts with
 * the same fixed "now"; timers keep running. Tests that need their own instant (or a frozen
 * clock) still call `page.clock.install(...)`, which overrides this.
 */
export const VISUAL_FIXED_NOW = new Date("2026-10-03T09:30:00+02:00");

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.install({ time: VISUAL_FIXED_NOW });
    await page.clock.resume();
    await use(page);
  },
});

export { expect } from "@playwright/test";
