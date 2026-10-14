import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootMetrio, clickSubnav, setViewport } from "./visualBoot";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const KEY = "UX-1531";
const OWNER = ".task-journey-drawer .drawer__body";

async function openFromDeliveryRisk(page: Page) {
  await clickSubnav(page, /delivery risk/i);
  const view = page.getByTestId("delivery-risk-view");
  await expect(view).toBeVisible({ timeout: 15_000 });
  await view.locator("tbody tr").filter({ hasText: KEY }).first().click();
  await expect(page.getByTestId("task-journey-drawer")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(700);
}

async function openFromTaskList(page: Page) {
  await clickSubnav(page, /^overview$/i);
  const link = page.getByTestId("team-attention-row").getByTestId("grouped-issue-count-link").first();
  await expect(link).toBeVisible({ timeout: 15_000 });
  await link.click();
  const modal = page.getByTestId("task-list-modal");
  await expect(modal).toBeVisible();
  const info = modal.locator("tr").filter({ hasText: KEY }).getByTestId("task-list-info").first();
  await expect(info).toBeVisible();
  await info.click();
  await expect(page.getByTestId("task-journey-drawer")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(700);
}

interface Run {
  start: number;
  end: number;
  outerDelta: number;
  prevented: boolean;
  samples: number[];
}

/** Wheel notch(es) dispatched on NESTED CONTENT (a real pointer is never over the bare owner). */
async function wheelOver(page: Page, childSel: string, deltas: Array<[number, number]> = [[100, 0]]): Promise<Run> {
  await page.locator(OWNER).evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
  await page.waitForTimeout(450);
  return page.evaluate(
    async ({ childSel, deltas, OWNER }) => {
      const child = document.querySelector(childSel) as HTMLElement;
      if (!child) throw new Error(`no element for ${childSel}`);
      const owner = document.querySelector(OWNER) as HTMLElement;
      const outer = document.querySelector(".metrio-scroll--primary") as HTMLElement;
      const start = owner.scrollTop;
      const outerStart = outer?.scrollTop ?? 0;
      const samples: number[] = [];
      let on = true;
      const tick = () => {
        if (!on) return;
        samples.push(owner.scrollTop);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      let prevented = false;
      for (const [dy, wait] of deltas) {
        const ev = new WheelEvent("wheel", { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true, composed: true });
        child.dispatchEvent(ev);
        prevented = prevented || ev.defaultPrevented;
        await new Promise((r) => setTimeout(r, wait));
      }
      await new Promise((r) => setTimeout(r, 1800));
      on = false;
      return { start, end: owner.scrollTop, outerDelta: (outer?.scrollTop ?? 0) - outerStart, prevented, samples };
    },
    { childSel, deltas, OWNER },
  );
}

function expectSmoothTaskScroll(r: Run, total: number, label: string) {
  expect(r.prevented, `${label}: engine consumed it`).toBe(true);
  expect(r.end, `${label}: drawer moved`).toBeGreaterThan(r.start + total * 0.9 * 0.9);
  expect(r.outerDelta, `${label}: outer page unchanged`).toBe(0);
  const mid = r.samples.filter((v) => v > r.start + 1 && v < r.end - 1);
  expect(mid.length, `${label}: continuous interpolation`).toBeGreaterThanOrEqual(4);
}

const CONTENT_TARGETS: Array<[string, string]> = [
  ["attention card", ".task-journey-drawer [data-testid='task-journey-diagnostic-block'] *"],
  ["task path tag", ".task-journey-drawer [data-testid='task-journey-path-tag']"],
  ["timeline row", ".task-journey-drawer [data-testid='task-journey-status'] *"],
  ["section blank space", ".task-journey-drawer .task-journey-drawer__section"],
];

test("task drawer (from Delivery Risk): wheel over every content area scrolls the ONE drawer body smoothly", async ({ page }) => {
  await setViewport(page, 1440, 600);
  await bootMetrio(page, "lead");
  await openFromDeliveryRisk(page);
  const over = await page.locator(OWNER).evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }));
  expect(over.sh).toBeGreaterThan(over.ch + 150); // long content, real overflow
  for (const [label, sel] of CONTENT_TARGETS) {
    expectSmoothTaskScroll(await wheelOver(page, sel), 100, label);
  }
  // both directions + repeated notches extend the same motion
  const many = await wheelOver(page, CONTENT_TARGETS[2]![1], [[100, 60], [100, 60], [100, 60]]);
  expectSmoothTaskScroll(many, 300, "3 notches");
  const back = await page.evaluate(async (OWNER) => {
    const owner = document.querySelector(OWNER) as HTMLElement;
    const child = document.querySelector(".task-journey-drawer [data-testid='task-journey-path-tag']") as HTMLElement;
    const before = owner.scrollTop;
    child.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, deltaMode: 0, bubbles: true, cancelable: true, composed: true }));
    await new Promise((r) => setTimeout(r, 1500));
    return { before, after: owner.scrollTop };
  }, OWNER);
  expect(back.after).toBeLessThan(back.before - 50);
});

test("task drawer: only ONE vertical scroll owner for the content (no nested scroller)", async ({ page }) => {
  await setViewport(page, 1440, 600);
  await bootMetrio(page, "lead");
  await openFromDeliveryRisk(page);
  const owners = await page.evaluate(() => {
    const drawer = document.querySelector(".task-journey-drawer")!;
    return [...drawer.querySelectorAll<HTMLElement>("*")]
      .filter((el) => {
        const oy = getComputedStyle(el).overflowY;
        return (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1;
      })
      .map((el) => el.className.toString().split(" ")[0]);
  });
  expect(owners).toEqual(["drawer__body"]);
});

test("REGRESSION: a rounding-level overflow wrapper inside the drawer never starves the real owner", async ({ page }) => {
  await setViewport(page, 1440, 600);
  await bootMetrio(page, "lead");
  await openFromDeliveryRisk(page);
  // Emulate the failure mode: a content wrapper that is `overflow-y:auto; overscroll-behavior:contain`
  // and 1px taller than its box. A heuristic that treats it as a nested scroller swallows the wheel.
  await page.evaluate(() => {
    const wrap = document.querySelector("[data-testid='task-journey-drawer']") as HTMLElement;
    wrap.style.cssText = "overflow-y:auto;overscroll-behavior:contain;";
    const pad = document.createElement("div");
    pad.style.cssText = "height:1px;margin-top:-1px;position:relative;top:1px;";
    wrap.appendChild(pad);
    wrap.style.height = `${wrap.scrollHeight - 1}px`;
  });
  const diag = await page.evaluate(() => {
    const w = document.querySelector("[data-testid='task-journey-drawer']") as HTMLElement;
    return w.scrollHeight - w.clientHeight;
  });
  expect(diag).toBeGreaterThanOrEqual(1);
  expect(diag).toBeLessThanOrEqual(2);
  expectSmoothTaskScroll(await wheelOver(page, CONTENT_TARGETS[1]![1]), 100, "wheel over rounding-overflow wrapper");
});

test("task drawer: fixed footer keeps the body wheel-active and has no oversized hit area", async ({ page }) => {
  await setViewport(page, 1440, 600);
  await bootMetrio(page, "lead");
  await openFromDeliveryRisk(page);
  const geo = await page.evaluate(() => {
    const body = document.querySelector(".task-journey-drawer .drawer__body") as HTMLElement;
    const footer = document.querySelector(".task-journey-drawer .drawer__footer") as HTMLElement;
    const b = body.getBoundingClientRect();
    const f = footer.getBoundingClientRect();
    const probe = (x: number, y: number) => document.elementFromPoint(x, y);
    const x = (b.left + b.right) / 2;
    const justAbove = probe(x, f.top - 4);
    const nearScrollbar = probe(b.right - 3, b.top + 40);
    return {
      bodyBottom: b.bottom,
      footerTop: f.top,
      footerBottom: f.bottom,
      aboveInBody: !!justAbove && body.contains(justAbove),
      aboveInFooter: !!justAbove && footer.contains(justAbove),
      scrollbarIsBody: nearScrollbar === body,
      footerHeight: f.height,
    };
  });
  expect(Math.abs(geo.bodyBottom - geo.footerTop)).toBeLessThanOrEqual(1); // footer starts where body ends
  expect(geo.aboveInBody).toBe(true);
  expect(geo.aboveInFooter).toBe(false);
  expect(geo.scrollbarIsBody).toBe(true);
  expect(geo.footerHeight).toBeLessThan(80);
  // wheel at the scrollbar lane edge also scrolls the body
  const r = await wheelOver(page, ".task-journey-drawer .drawer__body");
  expectSmoothTaskScroll(r, 100, "wheel on the body itself");
});

test("task drawer (from a task list modal): wheel scrolls the same shared drawer body", async ({ page }) => {
  await setViewport(page, 1440, 600);
  await bootMetrio(page, "lead");
  await openFromTaskList(page);
  expectSmoothTaskScroll(await wheelOver(page, CONTENT_TARGETS[0]![1]), 100, "from task list");
});

for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 1440]) {
    test(`task path renders as wrapping tags (order, repeats, 8px gaps, no arrows) (${theme} ${width})`, async ({ page }) => {
      await setViewport(page, width, 760);
      await bootMetrio(page, "lead");
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      await openFromDeliveryRisk(page);
      const tags = page.getByTestId("task-journey-path-tag");
      const labels = await tags.allTextContents();
      expect(labels).toEqual([
        "To Do",
        "Draft",
        "In Review",
        "Approved",
        "In Progress",
        "On Hold",
        "In Progress",
        "In Review",
      ]);
      expect(labels.join(" ")).not.toContain("→");
      const info = await page.evaluate(() => {
        const list = document.querySelector("[data-testid='task-journey-path']") as HTMLElement;
        const body = document.querySelector(".task-journey-drawer .drawer__body") as HTMLElement;
        const items = [...list.querySelectorAll<HTMLElement>("[data-testid='task-journey-path-tag']")];
        const rects = items.map((el) => el.getBoundingClientRect());
        const colors = items.map((el) => getComputedStyle(el).color + "|" + getComputedStyle(el).backgroundColor);
        const lane = body.getBoundingClientRect().right - 8;
        return {
          rects: rects.map((r) => ({ l: r.left, r: r.right, t: r.top, b: r.bottom })),
          colors,
          laneLeft: lane,
          listRight: list.getBoundingClientRect().right,
          listWidth: list.getBoundingClientRect().width,
        };
      });
      // same stage → same colour, different stage families differ
      expect(info.colors[4]).toBe(info.colors[6]); // In Progress ×2
      expect(info.colors[2]).toBe(info.colors[7]); // In Review ×2
      expect(info.colors[0]).not.toBe(info.colors[4]); // To Do vs In Progress
      expect(info.colors[4]).not.toBe(info.colors[2]); // active vs review
      expect(info.colors[2]).not.toBe(info.colors[3]); // review (amber) vs Approved (green)
      // gaps between neighbours on one row are 8px; nothing reaches the scrollbar lane
      for (let i = 1; i < info.rects.length; i += 1) {
        const prev = info.rects[i - 1]!;
        const cur = info.rects[i]!;
        if (Math.abs(prev.t - cur.t) < 3) expect(Math.round(cur.l - prev.r)).toBe(8);
        else expect(cur.t).toBeGreaterThan(prev.b); // wrapped to the next line
      }
      expect(Math.max(...info.rects.map((r) => r.r))).toBeLessThanOrEqual(info.laneLeft);
      expect(Math.max(...info.rects.map((r) => r.r))).toBeLessThanOrEqual(info.listRight + 0.5);
    });
  }
}
