import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootMetrio, bootNotifications, openDirectReportPersonDrawer, setViewport } from "./visualBoot";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

/**
 * SYNTHETIC wheel tests (events dispatched in the page, on a CHILD inside the scroll owner like a
 * real pointer over content). They are not physical-hardware verification.
 * Engine under test: Lenis, lerp 0.09 (tuned from averquo 0.07) / wheelMultiplier 0.9.
 */
const MULT = 0.9;

interface Run {
  start: number;
  end: number;
  max: number;
  prevented: boolean[];
  /** [ms since first event, scrollTop] sampled every animation frame. */
  samples: Array<[number, number]>;
}

async function wheelRun(
  page: Page,
  childSel: string,
  ownerSel: string,
  deltas: Array<[number, number]>, // [deltaY, wait ms after this event]
  settleMs = 1800,
): Promise<Run> {
  return page.evaluate(
    async ({ childSel, ownerSel, deltas, settleMs }) => {
      const child = document.querySelector(childSel) as HTMLElement;
      const owner = document.querySelector(ownerSel) as HTMLElement;
      if (!child || !owner) throw new Error("missing child/owner");
      const start = owner.scrollTop;
      const t0 = performance.now();
      const prevented: boolean[] = [];
      const samples: Array<[number, number]> = [];
      let sampling = true;
      const sample = () => {
        if (!sampling) return;
        samples.push([Math.round(performance.now() - t0), owner.scrollTop]);
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      for (const [dy, wait] of deltas) {
        const ev = new WheelEvent("wheel", { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true, composed: true });
        child.dispatchEvent(ev);
        prevented.push(ev.defaultPrevented);
        await new Promise((r) => setTimeout(r, wait));
      }
      await new Promise((r) => setTimeout(r, settleMs));
      sampling = false;
      return { start, end: owner.scrollTop, max: owner.scrollHeight - owner.clientHeight, prevented, samples };
    },
    { childSel, ownerSel, deltas, settleMs },
  );
}

function expectContinuous(r: Run, total: number) {
  const target = Math.min(r.start + total * MULT, r.max);
  expect(r.prevented[0], "engine consumed the first input").toBe(true);
  expect(r.end).toBeCloseTo(target, -0.5);
  expect(Math.abs(r.end - target)).toBeLessThan(2);
  const mid = r.samples.filter(([, v]) => v > r.start + 1 && v < target - 1);
  expect(mid.length, "many intermediate frames (continuous, not stepped)").toBeGreaterThanOrEqual(6);
  // monotone approach to target while the input is in one direction
  const values = r.samples.map(([, v]) => v);
  expect(values.every((v, i) => i === 0 || v >= values[i - 1]! - 0.5)).toBe(true);
}

async function reset(page: Page, ownerSel: string) {
  await page.locator(ownerSel).evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
  await page.waitForTimeout(400);
}

test("A. Performance: wheel over nested content moves the main owner as one damped motion", async ({ page }) => {
  await setViewport(page, 1440, 700);
  await bootMetrio(page, "lead");
  const owner = ".metrio-scroll--primary";
  const child = `${owner} .performance-table, ${owner} h2, ${owner} p`;
  expect(await page.locator(owner).evaluate((el) => el.scrollHeight > el.clientHeight + 300)).toBe(true);
  // one notch
  await reset(page, owner);
  const one = await wheelRun(page, child, owner, [[100, 0]]);
  expectContinuous(one, 100);
  // the tail is damped, not a short per-notch animation: still moving ~150ms in, not settled
  const at150 = one.samples.find(([t]) => t >= 150)![1];
  expect(at150).toBeLessThan(one.end - 3);
  // 3-5 quick notches extend the same motion
  await reset(page, owner);
  const many = await wheelRun(page, child, owner, [[100, 50], [100, 50], [100, 50], [100, 50]], 2200);
  expectContinuous(many, 400);
});

test("direction reversal retargets immediately", async ({ page }) => {
  await setViewport(page, 1440, 700);
  await bootMetrio(page, "lead");
  const owner = ".metrio-scroll--primary";
  const child = `${owner} .performance-table, ${owner} h2, ${owner} p`;
  await reset(page, owner);
  const r = await wheelRun(page, child, owner, [[300, 120], [-300, 0]], 2400);
  expect(r.end).toBeLessThan(5); // came back to the start
  const peak = Math.max(...r.samples.map(([, v]) => v));
  expect(peak).toBeGreaterThan(5);
  expect(peak).toBeLessThan(300 * MULT); // the reversal cut the forward motion short
});

test("B. Notifications: wheel over a card moves the drawer body smoothly", async ({ page }) => {
  await setViewport(page, 1440, 430);
  await bootNotifications(page, "light");
  await page.getByRole("button", { name: /Notifications, \d+ unread/i }).click();
  await expect(page.locator(".drawer--notifications")).toBeVisible();
  await page.waitForTimeout(600);
  const owner = ".drawer--notifications .drawer__body";
  const child = ".drawer--notifications .notification-center__card *";
  await reset(page, owner);
  expectContinuous(await wheelRun(page, child, owner, [[60, 40], [60, 0]]), 120);
});

test("C. Person: wheel over card content moves the drawer body smoothly", async ({ page }) => {
  await setViewport(page, 1440, 480);
  await bootMetrio(page, "lead");
  await openDirectReportPersonDrawer(page);
  await page.waitForTimeout(800);
  const owner = ".drawer--person-detail .drawer__body";
  const child = ".drawer--person-detail .drawer__body .person-drawer-view--active *";
  expect(await page.locator(owner).evaluate((el) => el.scrollHeight > el.clientHeight + 200)).toBe(true);
  await reset(page, owner);
  expectContinuous(await wheelRun(page, child, owner, [[100, 50], [100, 0]]), 200);
});

test("D. an independently scrollable child consumes the wheel first; the drawer does not move", async ({ page }) => {
  await setViewport(page, 1440, 480);
  await bootMetrio(page, "lead");
  await openDirectReportPersonDrawer(page);
  await page.waitForTimeout(800);
  const r = await page.evaluate(async () => {
    const body = document.querySelector(".drawer--person-detail .drawer__body") as HTMLElement;
    const inner = document.createElement("div");
    inner.style.cssText = "height:120px;overflow-y:auto;overscroll-behavior:auto;";
    inner.innerHTML = '<div style="height:900px">x</div>';
    body.prepend(inner);
    const before = body.scrollTop;
    const ev = new WheelEvent("wheel", { deltaY: 100, deltaMode: 0, bubbles: true, cancelable: true, composed: true });
    inner.dispatchEvent(ev);
    await new Promise((res) => setTimeout(res, 900));
    return { prevented: ev.defaultPrevented, outerDelta: body.scrollTop - before };
  });
  expect(r.prevented).toBe(false); // the child owns it (native)
  expect(r.outerDelta).toBe(0);
});

test("E. at the child's boundary the parent drawer takes over", async ({ page }) => {
  await setViewport(page, 1440, 480);
  await bootMetrio(page, "lead");
  await openDirectReportPersonDrawer(page);
  await page.waitForTimeout(800);
  const r = await page.evaluate(async () => {
    const body = document.querySelector(".drawer--person-detail .drawer__body") as HTMLElement;
    const inner = document.createElement("div");
    inner.style.cssText = "height:120px;overflow-y:auto;overscroll-behavior:auto;";
    inner.innerHTML = '<div style="height:400px">x</div>';
    body.prepend(inner);
    inner.scrollTop = 1000; // clamp to its bottom
    const before = body.scrollTop;
    const ev = new WheelEvent("wheel", { deltaY: 100, deltaMode: 0, bubbles: true, cancelable: true, composed: true });
    inner.dispatchEvent(ev);
    await new Promise((res) => setTimeout(res, 1500));
    return { prevented: ev.defaultPrevented, outerDelta: body.scrollTop - before };
  });
  expect(r.prevented).toBe(true);
  expect(r.outerDelta).toBeGreaterThan(60);
});

test("F. reduced motion: no custom interpolation (native)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setViewport(page, 1440, 700);
  await bootMetrio(page, "lead");
  const owner = ".metrio-scroll--primary";
  const r = await wheelRun(page, `${owner} h2, ${owner} p`, owner, [[100, 0]], 300);
  expect(r.prevented[0]).toBe(false);
});

test("fail-open: a non-scrolling short drawer never swallows the wheel", async ({ page }) => {
  await setViewport(page, 1440, 900);
  await bootNotifications(page, "light");
  await page.getByRole("button", { name: /Notifications, \d+ unread/i }).click();
  await expect(page.locator(".drawer--notifications")).toBeVisible();
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const body = document.querySelector(".drawer--notifications .drawer__body") as HTMLElement;
    const overflow = body.scrollHeight > body.clientHeight + 1;
    const ev = new WheelEvent("wheel", { deltaY: 100, deltaMode: 0, bubbles: true, cancelable: true, composed: true });
    body.firstElementChild!.dispatchEvent(ev);
    return { overflow, prevented: ev.defaultPrevented };
  });
  if (!r.overflow) expect(r.prevented).toBe(false);
});
