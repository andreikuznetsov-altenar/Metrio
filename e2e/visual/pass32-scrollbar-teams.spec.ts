import { createRequire } from "node:module";
import { expect } from "@playwright/test";
import { test } from "./baseTest";
import { bootOrgRoleScenario, openPerformanceFromHome, setViewport } from "./visualBoot";
// Playwright vendors a PNG decoder; used to measure the *visible* scrollbar thumb.
const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as {
  PNG: { sync: { read: (buf: Buffer) => { width: number; height: number; data: Buffer } } };
};

// Real (non-hidden) scrollbars are required to measure geometry.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

async function openTeams(page: import("@playwright/test").Page, theme: "light" | "dark", width: number) {
  await bootOrgRoleScenario(page, "mom", { theme, width });
  await openPerformanceFromHome(page);
  await page.locator(".performance-subnav__link").filter({ hasText: "Teams" }).click();
  await expect(page.getByTestId("leadership-branches-performance")).toBeVisible();
}

async function geometry(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const rect = (el: Element | null) => {
      const r = el?.getBoundingClientRect();
      return r ? { l: Math.round(r.left * 10) / 10, r: Math.round(r.right * 10) / 10 } : null;
    };
    const table = document.querySelector("[data-testid='leadership-branches-performance'] table");
    return {
      subnav: rect(document.querySelector(".performance-subnav")),
      table: rect(table),
      columns: Array.from(table?.querySelectorAll("thead th") ?? []).map((th) => rect(th)),
      toolbar: rect(document.querySelector(".app-header")),
    };
  });
}

function sameWithin1(a: unknown, b: unknown) {
  const x = JSON.stringify(a).match(/-?\d+(\.\d+)?/g)!.map(Number);
  const y = JSON.stringify(b).match(/-?\d+(\.\d+)?/g)!.map(Number);
  expect(x.length).toBe(y.length);
  x.forEach((value, i) => expect(Math.abs(value - y[i]!)).toBeLessThanOrEqual(1));
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 1440, 1728]) {
    test(`teams expansion does not shift content (${theme} ${width})`, async ({ page }) => {
      await openTeams(page, theme, width);
      // Short viewport so the expanded table needs a vertical scrollbar and the collapsed one does not.
      await setViewport(page, width, 430);
      await page.waitForTimeout(300);
      const toggles = page.getByTestId("leadership-branch-toggle");
      await expect(toggles.first()).toBeVisible();
      const collapsed = await geometry(page);
      const owner = page.locator(".metrio-scroll--primary").first();
      const before = await owner.evaluate((el) => ({ over: el.scrollHeight > el.clientHeight }));

      await toggles.first().click();
      await page.waitForTimeout(500);
      const expanded = await geometry(page);
      const during = await owner.evaluate((el) => ({ over: el.scrollHeight > el.clientHeight }));
      expect(before.over).toBe(false);
      expect(during.over).toBe(true); // a scrollbar really appeared
      sameWithin1(collapsed, expanded);

      await page.getByRole("button", { name: /Collapse .* team/ }).first().click();
      await page.waitForTimeout(500);
      const collapsedAgain = await geometry(page);
      sameWithin1(collapsed, collapsedAgain);
    });
  }
}

test("primary scrollbar: 4px visible thumb, transparent track, no buttons", async ({ page }) => {
  await openTeams(page, "light", 1440);
  await setViewport(page, 1440, 430);
  await page.getByTestId("leadership-branch-toggle").first().click();
  await page.waitForTimeout(500);
  const shot = PNG.sync.read(await page.screenshot());
  const y = Math.floor(shot.height * 0.45);
  const bg = [0, 1, 2].map((c) => shot.data[(y * shot.width + 2) * 4 + c]);
  const row: boolean[] = [];
  for (let x = shot.width - 12; x < shot.width; x += 1) {
    const i = (y * shot.width + x) * 4;
    row.push([0, 1, 2].some((c) => Math.abs(shot.data[i + c]! - bg[c]!) > 6));
  }
  const thumbPixels = row.filter(Boolean).length;
  expect(thumbPixels).toBe(4); // visible thumb is exactly 4px
  // Track lane (8px) is transparent: the pixels beside the thumb equal the page background.
  expect(row.slice(-4).every((v) => !v)).toBe(true);
  const css = await page.evaluate(() => {
    const style = (pseudo: string) => {
      const el = document.querySelector(".metrio-scroll--primary")!;
      const s = getComputedStyle(el, pseudo);
      return { width: s.width, background: s.backgroundColor, display: s.display };
    };
    return { bar: style("::-webkit-scrollbar"), track: style("::-webkit-scrollbar-track"), button: style("::-webkit-scrollbar-button") };
  });
  expect(css.bar.width).toBe("8px");
  expect(css.track.background).toBe("rgba(0, 0, 0, 0)");
  expect(css.button.display).toBe("none");
});

// ── PASS33: 8px end insets, measured on real pixels ─────────────────────────────────────────
type Box = { top: number; bottom: number; right: number };

async function thumbExtent(page: import("@playwright/test").Page, selector: string) {
  const box: Box = await page.evaluate((sel) => {
    const r = document.querySelector(sel)!.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, right: r.right };
  }, selector);
  const shot = PNG.sync.read(await page.screenshot());
  const x0 = Math.round(box.right) - 8;
  const top = Math.round(box.top);
  const bottom = Math.round(box.bottom);
  const probe = (x: number, y: number) => (y * shot.width + x) * 4;
  const bg = [0, 1, 2].map((c) => shot.data[probe(x0 + 7, top + 10) + c]!);
  const lit = (x: number, y: number) =>
    [0, 1, 2].some((c) => Math.abs(shot.data[probe(x, y) + c]! - bg[c]!) > 10);
  let first = -1;
  let last = -1;
  for (let y = top; y < bottom; y += 1) {
    let on = false;
    for (let x = x0; x < x0 + 8; x += 1) if (lit(x, y)) on = true;
    if (on) {
      if (first < 0) first = y;
      last = y;
    }
  }
  const mid = Math.floor((first + last) / 2);
  let width = 0;
  for (let x = x0; x < x0 + 8; x += 1) if (lit(x, mid)) width += 1;
  return { topInset: first - top, bottomInset: bottom - 1 - last, width };
}

for (const width of [1280, 1440, 1728]) {
  test(`primary scrollbar keeps 8px end insets (performance, ${width})`, async ({ page }) => {
    await bootOrgRoleScenario(page, "mom", { theme: "light", width });
    await openPerformanceFromHome(page);
    await setViewport(page, width, 560);
    const sel = ".metrio-scroll--primary";
    const over = await page.locator(sel).first().evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(over).toBe(true);
    await page.locator(sel).first().evaluate((el) => {
      (el as HTMLElement).style.scrollBehavior = "auto";
      el.scrollTop = 0;
    });
    await page.waitForTimeout(200);
    const atTop = await thumbExtent(page, sel);
    expect(Math.abs(atTop.topInset - 8)).toBeLessThanOrEqual(1);
    expect(atTop.width).toBe(4);
    await page.locator(sel).first().evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(300);
    const atBottom = await thumbExtent(page, sel);
    expect(Math.abs(atBottom.bottomInset - 8)).toBeLessThanOrEqual(1);
    expect(atBottom.width).toBe(4);
  });
}

test("Manager Teams expanded keeps 8px end insets and no x shift", async ({ page }) => {
  await openTeams(page, "light", 1440);
  await setViewport(page, 1440, 430);
  const collapsed = await geometry(page);
  await page.getByTestId("leadership-branch-toggle").first().click();
  await page.waitForTimeout(500);
  const sel = ".metrio-scroll--primary";
  await page.locator(sel).first().evaluate((el) => {
    (el as HTMLElement).style.scrollBehavior = "auto";
    el.scrollTop = 0;
  });
  await page.waitForTimeout(200);
  const atTop = await thumbExtent(page, sel);
  expect(Math.abs(atTop.topInset - 8)).toBeLessThanOrEqual(1);
  await page.locator(sel).first().evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(300);
  const atBottom = await thumbExtent(page, sel);
  expect(Math.abs(atBottom.bottomInset - 8)).toBeLessThanOrEqual(1);
  await page.locator(sel).first().evaluate((el) => {
    el.scrollTop = 0;
  });
  sameWithin1(collapsed, await geometry(page));
});

test("long drawer: 4px thumb with 8px end insets", async ({ page }) => {
  await bootOrgRoleScenario(page, "leaf", { theme: "light", width: 1440 });
  await openPerformanceFromHome(page);
  await page.locator(".performance-subnav__link").filter({ hasText: "People" }).click();
  await setViewport(page, 1440, 420);
  await page.locator("table tbody tr button").first().click();
  const sel = "[data-testid='person-detail-drawer'] .drawer__body";
  await expect(page.locator(sel)).toBeVisible();
  await page.waitForTimeout(700);
  const over = await page.locator(sel).evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(over).toBe(true);
  await page.locator(sel).evaluate((el) => {
    (el as HTMLElement).style.scrollBehavior = "auto";
    el.scrollTop = 0;
  });
  await page.waitForTimeout(200);
  const atTop = await thumbExtent(page, sel);
  expect(Math.abs(atTop.topInset - 8)).toBeLessThanOrEqual(1);
  expect(atTop.width).toBe(4);
  await page.locator(sel).evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(300);
  const atBottom = await thumbExtent(page, sel);
  expect(Math.abs(atBottom.bottomInset - 8)).toBeLessThanOrEqual(1);
});

test("smooth-scroll contract: smooth normally, auto under reduced motion", async ({ page }) => {
  await bootOrgRoleScenario(page, "mom", { theme: "light", width: 1440 });
  await openPerformanceFromHome(page);
  const read = () =>
    page.evaluate(() => {
      const behavior = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).scrollBehavior : null;
      };
      return { primary: behavior(".metrio-scroll--primary"), secondary: behavior(".metrio-scroll") };
    });
  const normal = await read();
  expect(normal.primary).toBe("smooth");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await read();
  expect(reduced.primary).toBe("auto");
});
