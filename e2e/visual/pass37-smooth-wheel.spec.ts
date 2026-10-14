import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootMetrio, bootNotifications, openDirectReportPersonDrawer, setViewport } from "./visualBoot";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

/** Dispatches one synthetic coarse (line-mode) wheel notch and samples scrollTop per frame. */
async function coarseNotch(page: Page, selector: string, lines = 3) {
  return page.evaluate(
    async ({ sel, n }) => {
      const el = document.querySelector(sel) as HTMLElement;
      const start = el.scrollTop;
      const ev = new WheelEvent("wheel", { deltaY: n, deltaMode: 1, bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
      const samples: number[] = [];
      for (let i = 0; i < 40; i += 1) {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        samples.push(el.scrollTop);
      }
      return { start, prevented: ev.defaultPrevented, samples, end: el.scrollTop, max: el.scrollHeight - el.clientHeight };
    },
    { sel: selector, n: lines },
  );
}

function expectSmooth(r: Awaited<ReturnType<typeof coarseNotch>>) {
  expect(r.prevented).toBe(true);
  const expected = Math.min(r.start + 120, r.max);
  expect(r.end).toBeCloseTo(expected, 0);
  const intermediate = r.samples.filter((v) => v > r.start + 1 && v < expected - 1);
  expect(intermediate.length, "scroll passes through intermediate positions").toBeGreaterThanOrEqual(2);
}

async function trackpadStays(page: Page, selector: string) {
  return page.evaluate(
    async (sel) => {
      const el = document.querySelector(sel) as HTMLElement;
      const out: boolean[] = [];
      for (const dy of [3.5, 7.25, 11.75, 2.5]) {
        const ev = new WheelEvent("wheel", { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true });
        el.dispatchEvent(ev);
        out.push(ev.defaultPrevented);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      return out;
    },
    selector,
  );
}

test("performance main page: coarse wheel is smooth, trackpad-like stays native", async ({ page }) => {
  await setViewport(page, 1440, 700);
  await bootMetrio(page, "lead");
  const sel = ".metrio-scroll--primary";
  expect(await page.locator(sel).evaluate((el) => el.scrollHeight > el.clientHeight + 200)).toBe(true);
  expect(await trackpadStays(page, sel)).toEqual([false, false, false, false]);
  await page.waitForTimeout(400);
  expectSmooth(await coarseNotch(page, sel));
});

test("person drawer: coarse wheel is smooth on the single drawer scroll owner", async ({ page }) => {
  await setViewport(page, 1440, 480);
  await bootMetrio(page, "lead");
  await openDirectReportPersonDrawer(page);
  await page.waitForTimeout(800);
  const sel = ".drawer--person-detail .drawer__body";
  expect(await page.locator(sel).evaluate((el) => el.scrollHeight > el.clientHeight + 200)).toBe(true);
  expect(await trackpadStays(page, sel)).toEqual([false, false, false, false]);
  await page.waitForTimeout(400);
  expectSmooth(await coarseNotch(page, sel));
});

test("notifications drawer: coarse wheel is smooth; three notches accumulate; reverse retargets", async ({ page }) => {
  await setViewport(page, 1440, 430);
  await bootNotifications(page, "light");
  await page.getByRole("button", { name: /Notifications, \d+ unread/i }).click();
  await expect(page.locator(".drawer--notifications")).toBeVisible();
  await page.waitForTimeout(600);
  const sel = ".drawer--notifications .drawer__body";
  expectSmooth(await coarseNotch(page, sel));
  const accum = await page.evaluate(async (s) => {
    const el = document.querySelector(s) as HTMLElement;
    el.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    await new Promise((r) => setTimeout(r, 100));
    const fire = (n: number) =>
      el.dispatchEvent(new WheelEvent("wheel", { deltaY: n, deltaMode: 1, bubbles: true, cancelable: true }));
    fire(1); // 40px
    await new Promise((r) => setTimeout(r, 40));
    fire(1);
    await new Promise((r) => setTimeout(r, 40));
    fire(1);
    await new Promise((r) => setTimeout(r, 600));
    const forward = el.scrollTop;
    fire(-1);
    await new Promise((r) => setTimeout(r, 600));
    return { forward, reversed: el.scrollTop, max: el.scrollHeight - el.clientHeight };
  }, sel);
  expect(accum.forward).toBeCloseTo(Math.min(120, accum.max), 0);
  expect(accum.reversed).toBeCloseTo(Math.max(Math.min(120, accum.max) - 40, 0), 0);
});

test("nested scroller consumes the wheel first; the outer owner does not move", async ({ page }) => {
  await setViewport(page, 1440, 480);
  await bootMetrio(page, "lead");
  await openDirectReportPersonDrawer(page);
  await page.waitForTimeout(800);
  const r = await page.evaluate(async () => {
    const body = document.querySelector(".drawer--person-detail .drawer__body") as HTMLElement;
    const inner = document.createElement("div");
    inner.id = "nested-probe";
    inner.style.cssText = "height:120px;overflow-y:auto;";
    inner.innerHTML = '<div style="height:900px">x</div>';
    body.prepend(inner);
    const before = body.scrollTop;
    const ev = new WheelEvent("wheel", { deltaY: 3, deltaMode: 1, bubbles: true, cancelable: true });
    inner.dispatchEvent(ev);
    await new Promise((res) => setTimeout(res, 500));
    return { prevented: ev.defaultPrevented, outerDelta: body.scrollTop - before };
  });
  expect(r.prevented).toBe(false); // native inner scrolling owns it
  expect(r.outerDelta).toBe(0);
});

test("reduced motion: no custom interpolation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setViewport(page, 1440, 700);
  await bootMetrio(page, "lead");
  const r = await coarseNotch(page, ".metrio-scroll--primary");
  expect(r.prevented).toBe(false);
});
