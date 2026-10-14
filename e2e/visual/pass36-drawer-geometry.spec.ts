import { createRequire } from "node:module";
import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootMetrio, bootNotifications, openDirectReportPersonDrawer, setViewport } from "./visualBoot";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as {
  PNG: { sync: { read: (buf: Buffer) => { width: number; height: number; data: Buffer } } };
};

// Real scrollbars are required to measure geometry.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

type Rect = { l: number; r: number; t: number; b: number };

async function rects(page: Page, selectors: Record<string, string>) {
  return page.evaluate((map) => {
    const out: Record<string, { l: number; r: number; t: number; b: number } | null> = {};
    for (const [key, selector] of Object.entries(map)) {
      const el = document.querySelector(selector);
      const r = el?.getBoundingClientRect();
      out[key] = r ? { l: r.left, r: r.right, t: r.top, b: r.bottom } : null;
    }
    return out;
  }, selectors);
}

function within1(a: number, b: number, label: string) {
  expect(Math.abs(a - b), label).toBeLessThanOrEqual(1);
}

async function laneThumb(page: Page, bodySelector: string) {
  const box = (await rects(page, { body: bodySelector })).body as Rect;
  const shot = PNG.sync.read(await page.screenshot());
  const x0 = Math.round(box.r) - 8;
  const top = Math.round(box.t);
  const bottom = Math.round(box.b);
  const px = (x: number, y: number) => (y * shot.width + x) * 4;
  const bg = [0, 1, 2].map((c) => shot.data[px(x0 - 6, top + 10) + c]!);
  const lit = (x: number, y: number) => [0, 1, 2].some((c) => Math.abs(shot.data[px(x, y) + c]! - bg[c]!) > 10);
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
  if (first < 0) return { present: false as const, topInset: 0, bottomInset: 0, leftGap: 0, rightGap: 0, width: 0 };
  const mid = Math.floor((first + last) / 2);
  const cols: number[] = [];
  for (let x = x0; x < x0 + 8; x += 1) if (lit(x, mid)) cols.push(x);
  return {
    present: true as const,
    topInset: first - top,
    bottomInset: bottom - 1 - last,
    leftGap: cols[0]! - x0,
    rightGap: x0 + 7 - cols[cols.length - 1]!,
    width: cols.length,
  };
}

const BODY = ".drawer--notifications .drawer__body";

async function openNotifications(page: Page, theme: "light" | "dark", width: number, height: number) {
  await setViewport(page, width, height);
  await bootNotifications(page, theme);
  await page.getByRole("button", { name: /Notifications, \d+ unread/i }).click();
  await expect(page.locator(".drawer--notifications")).toBeVisible();
  await page.waitForTimeout(600);
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 1440, 1728]) {
    test(`notifications: scrollbar at drawer's outer right edge, content never shifts (${theme} ${width})`, async ({ page }) => {
      await openNotifications(page, theme, width, 430);
      const sel = {
        drawer: ".drawer--notifications",
        body: BODY,
        tabs: ".drawer--notifications .notification-center__filters .segmented-control",
        card: ".drawer--notifications .notification-center__card",
      };
      // STATE A — overflowing
      const over = await page.locator(BODY).evaluate((el) => el.scrollHeight > el.clientHeight + 1);
      expect(over).toBe(true);
      const a = await rects(page, sel);
      within1(a.body!.r, a.drawer!.r, "scroll owner reaches the drawer's right edge");
      const thumb = await laneThumb(page, BODY);
      expect(thumb.present).toBe(true);
      expect(thumb.width).toBe(4);
      expect(thumb.leftGap).toBe(2);
      expect(thumb.rightGap).toBe(2);
      expect(Math.abs(thumb.topInset - 8)).toBeLessThanOrEqual(1);
      // thumb lane right edge == drawer right edge (lane is the last 8px of the body)
      // STATE B — same drawer, tall viewport so nothing overflows
      await setViewport(page, width, 1500);
      await page.waitForTimeout(500);
      const overB = await page.locator(BODY).evaluate((el) => el.scrollHeight > el.clientHeight + 1);
      expect(overB).toBe(false);
      const b = await rects(page, sel);
      for (const key of ["tabs", "card"] as const) {
        within1(a[key]!.l, b[key]!.l, `${key} left`);
        within1(a[key]!.r, b[key]!.r, `${key} right`);
      }
      expect((await laneThumb(page, BODY)).present).toBe(false); // no thumb, lane still reserved
    });
  }
}

test("notifications: Delete uses the canonical danger button treatment", async ({ page }) => {
  await openNotifications(page, "light", 1440, 900);
  const del = page.getByTestId("notification-delete").first();
  await expect(del).toBeVisible();
  const cls = await del.getAttribute("class");
  expect(cls).toContain("btn--danger");
  expect(cls).not.toContain("btn--ghost");
  const [actual, reference] = await page.evaluate(() => {
    const probe = document.createElement("button");
    probe.className = "btn btn--danger btn--compact";
    document.body.appendChild(probe);
    const el = document.querySelector("[data-testid='notification-delete']") as HTMLElement;
    const pick = (node: HTMLElement) => {
      const s = getComputedStyle(node);
      return { color: s.color, border: s.borderTopColor, bg: s.backgroundColor };
    };
    const out = [pick(el), pick(probe)];
    probe.remove();
    return out;
  });
  expect(actual).toEqual(reference);
  // actions sit together, vertically centred, on the card's right
  const layout = await page.evaluate(() => {
    const actions = document.querySelector(".notification-center__card-actions")!;
    const kids = Array.from(actions.children).map((c) => c.getBoundingClientRect());
    const card = actions.closest(".notification-center__card")!.getBoundingClientRect();
    return { mids: kids.map((k) => k.top + k.height / 2), rights: kids.map((k) => k.right), cardRight: card.right, count: kids.length };
  });
  expect(layout.count).toBeGreaterThanOrEqual(1);
  layout.mids.forEach((m) => within1(m, layout.mids[0]!, "action baseline"));
  expect(layout.cardRight - Math.max(...layout.rights)).toBeLessThan(20);
});

test("person drawer: outer-right scrollbar and no content shift across Overview/Work/History", async ({ page }) => {
  await setViewport(page, 1440, 560);
  await bootMetrio(page, "lead");
  await openDirectReportPersonDrawer(page);
  await page.waitForTimeout(800);
  const PBODY = ".drawer--person-detail .drawer__body";
  const sel = {
    drawer: ".drawer--person-detail",
    body: PBODY,
    tabs: ".drawer--person-detail .drawer__body .person-drawer-view--active .tabs__list",
  };
  const measure = async () => {
    const r = await rects(page, sel);
    const content = await page.evaluate(() => {
      const body = document.querySelector(".drawer--person-detail .drawer__body")!;
      const first = body.querySelector(".person-drawer-view--active > *, .person-drawer-view > *") as HTMLElement | null;
      const r = first?.getBoundingClientRect();
      return r ? { l: r.left, r: r.right } : null;
    });
    const overflow = await page.locator(PBODY).evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    return { r, content, overflow };
  };
  const overview = await measure();
  within1(overview.r.body!.r, overview.r.drawer!.r, "person scrollbar lane at drawer edge");
  if (overview.overflow) {
    const thumb = await laneThumb(page, PBODY);
    expect(thumb.width).toBe(4);
    expect(thumb.leftGap).toBe(2);
    expect(thumb.rightGap).toBe(2);
  }
  const tab = (name: string) => page.locator(PBODY).getByRole("button", { name, exact: true }).or(page.locator(PBODY).getByRole("tab", { name, exact: true })).first();
  const states = [overview];
  for (const name of ["Work", "History", "Overview"]) {
    await page.locator(PBODY).getByRole("tab", { name, exact: true }).click();
    await page.waitForTimeout(500);
    states.push(await measure());
  }
  for (const s of states.slice(1)) {
    within1(s.r.tabs!.l, overview.r.tabs!.l, "tabs left");
    within1(s.r.tabs!.r, overview.r.tabs!.r, "tabs right");
    if (s.content && overview.content) {
      within1(s.content.l, overview.content.l, "content left");
      within1(s.content.r, overview.content.r, "content right");
    }
  }
});

test("person drawer: availability renders as bounded cards (when time off exists)", async ({ page }) => {
  await setViewport(page, 1440, 900);
  await bootMetrio(page, "lead");
  await openDirectReportPersonDrawer(page);
  await page.waitForTimeout(800);
  const list = page.getByTestId("person-availability");
  test.skip((await list.count()) === 0, "scenario person has no planned time off");
  const info = await list.evaluate((ul) => {
    const cards = Array.from(ul.querySelectorAll("li > .card"));
    const gaps = cards.slice(1).map((c, i) => c.getBoundingClientRect().top - cards[i]!.getBoundingClientRect().bottom);
    const loose = Array.from(ul.children).filter((li) => !li.querySelector(".card")).length;
    return { count: cards.length, gaps, loose, borders: cards.map((c) => getComputedStyle(c).borderTopWidth) };
  });
  expect(info.count).toBeGreaterThanOrEqual(1);
  expect(info.loose).toBe(0);
  info.gaps.forEach((g) => within1(g, 8, "availability card gap"));
  info.borders.forEach((w) => expect(w).not.toBe("0px"));
});
