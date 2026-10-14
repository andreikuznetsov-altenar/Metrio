import { createRequire } from "node:module";
import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootMetrio, bootNotifications, setViewport } from "./visualBoot";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as {
  PNG: { sync: { read: (buf: Buffer) => { width: number; height: number; data: Buffer } } };
};

// Real (non-hidden) scrollbars at 2x Retina so the capsule can be measured in device pixels.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] }, deviceScaleFactor: 2 });

interface Profile {
  /** Painted coverage (0..1) summed across the 8 device-px lane, per row from the thumb end inward. */
  rows: number[];
  /** Device-px rows between the owner's edge and the first painted row. */
  endInset: number;
  /** Columns (0..7 of the lane) with ≥50% coverage at mid-thumb. */
  litColumns: number[];
}

async function measure(page: Page, ownerSel: string, end: "top" | "bottom"): Promise<Profile> {
  const owner = page.locator(ownerSel);
  await owner.evaluate((el, e) => {
    el.scrollTo({ top: e === "top" ? 0 : el.scrollHeight, behavior: "instant" as ScrollBehavior });
  }, end);
  await page.waitForTimeout(400);
  const box = (await owner.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { r: r.right, t: r.top, b: r.bottom };
  })) as { r: number; t: number; b: number };
  const shot = PNG.sync.read(await page.screenshot());
  const S = 2;
  const laneLeft = Math.round((box.r - 8) * S); // lane left edge in device px
  const top = Math.round(box.t * S);
  const bottom = Math.round(box.b * S);
  const px = (x: number, y: number) => (y * shot.width + x) * 4;
  const bg = [0, 1, 2].map((c) => shot.data[px(laneLeft - 12, top + 40) + c]!);
  // reference "full" colour: a pixel in the middle of the thumb core
  const cov = (x: number, y: number, full: number[]) => {
    const d = [0, 1, 2].map((c) => Math.abs(shot.data[px(x, y) + c]! - bg[c]!));
    const f = [0, 1, 2].map((c) => Math.abs(full[c]! - bg[c]!));
    const num = d.reduce((a, b) => a + b, 0);
    const den = f.reduce((a, b) => a + b, 0) || 1;
    return Math.min(1, num / den);
  };
  // locate thumb rows: any lit pixel in the lane
  const lit = (x: number, y: number) => [0, 1, 2].some((c) => Math.abs(shot.data[px(x, y) + c]! - bg[c]!) > 6);
  const rowsLit: number[] = [];
  for (let y = top; y < bottom; y += 1) {
    let on = false;
    for (let x = laneLeft; x < laneLeft + 16; x += 1) if (lit(x, y)) on = true;
    if (on) rowsLit.push(y);
  }
  if (rowsLit.length < 20) throw new Error(`no thumb found (${rowsLit.length})`);
  const first = rowsLit[0]!;
  const last = rowsLit[rowsLit.length - 1]!;
  const mid = Math.floor((first + last) / 2);
  const full = [0, 1, 2].map((c) => shot.data[px(laneLeft + 8, mid) + c]!);
  const lane = (y: number) =>
    Array.from({ length: 16 }, (_, i) => cov(laneLeft + i, y, full)).slice(0, 16);
  // lane is 8 CSS px = 16 device px wide
  const litColumns = lane(mid)
    .map((v, i) => (v >= 0.5 ? i : -1))
    .filter((i) => i >= 0);
  const rows: number[] = [];
  for (let i = 0; i < 12; i += 1) {
    const y = end === "top" ? first + i : last - i;
    rows.push(lane(y).reduce((a, b) => a + b, 0));
  }
  const endInset = end === "top" ? first - top : bottom - 1 - last;
  return { rows, endInset, litColumns };
}

function expectCapsule(p: Profile, label: string) {
  // visible thickness: 4 CSS px = 8 device px (the painted core)
  expect(p.litColumns.length, `${label} visible width`).toBe(8);
  // 2 CSS px empty on each side of the 8 CSS px lane
  expect(p.litColumns[0], `${label} left gap`).toBe(4);
  // ideal semicircle of radius 4 device px: row chord widths 3.87, 6.24, 7.40, 7.94
  const ideal = [3.87, 6.24, 7.4, 7.94];
  ideal.forEach((w, i) => {
    expect(Math.abs(p.rows[i]! - w), `${label} cap row ${i}: ${p.rows[i]!.toFixed(2)} vs ${w}`).toBeLessThan(1.1);
  });
  // an ellipse with a 4px-tall radius would still be < 6 wide at row 3; a true cap is full by row 3
  expect(p.rows[3]!, `${label} cap is full width within 4 device rows`).toBeGreaterThan(7);
  // beyond the cap the thumb is a straight 8px-wide bar
  expect(p.rows[8]!).toBeGreaterThan(7.5);
  // visible end inset: 8 CSS px = 16 device px (cap tip may lose ~1 row to anti-aliasing)
  expect(Math.abs(p.endInset - 16), `${label} end inset ${p.endInset}`).toBeLessThanOrEqual(2);
}

for (const theme of ["light", "dark"] as const) {
  test(`notifications drawer thumb is a true 4px capsule (top and bottom caps) (${theme})`, async ({ page }) => {
    await setViewport(page, 1440, 430);
    await bootNotifications(page, theme);
    await page.getByRole("button", { name: /Notifications, \d+ unread/i }).click();
    await expect(page.locator(".drawer--notifications")).toBeVisible();
    await page.waitForTimeout(600);
    const owner = ".drawer--notifications .drawer__body";
    expectCapsule(await measure(page, owner, "top"), `${theme} drawer top`);
    expectCapsule(await measure(page, owner, "bottom"), `${theme} drawer bottom`);
  });

  test(`main page thumb is a true 4px capsule (${theme})`, async ({ page }) => {
    await setViewport(page, 1440, 700);
    await bootMetrio(page, "lead");
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    const owner = ".metrio-scroll--primary";
    expectCapsule(await measure(page, owner, "top"), `${theme} main top`);
    expectCapsule(await measure(page, owner, "bottom"), `${theme} main bottom`);
  });
}
