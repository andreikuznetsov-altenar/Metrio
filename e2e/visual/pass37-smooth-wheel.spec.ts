import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootMetrio, bootNotifications, openDirectReportPersonDrawer, setViewport } from "./visualBoot";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

/**
 * SYNTHETIC mac-like wheel tests (pixel-mode events dispatched in the page). They are NOT
 * physical-hardware verification. Events are dispatched on a CHILD inside the scroll owner, the
 * way a real pointer over content produces them.
 */

/** Emulates the WebKit behavior behind the PASS37 regression: `behavior: "instant"` is not honored. */
async function emulateWebKitInstantIgnored(page: Page) {
  await page.addInitScript(() => {
    const orig = Element.prototype.scrollTo as (...a: unknown[]) => void;
    Element.prototype.scrollTo = function (this: Element, ...args: unknown[]) {
      const o = args[0] as ScrollToOptions | undefined;
      if (o && typeof o === "object" && o.behavior === ("instant" as ScrollBehavior)) {
        args[0] = { ...o, behavior: "auto" };
      }
      return orig.apply(this, args);
    } as typeof Element.prototype.scrollTo;
  });
}

interface BurstResult {
  start: number;
  end: number;
  max: number;
  prevented: boolean[];
  samples: number[];
}

/** Dispatches a pixel-mode notch sequence on `childSel`, sampling the owner every frame. */
async function pixelBurst(
  page: Page,
  childSel: string,
  ownerSel: string,
  deltas: number[],
  gapMs = 70,
): Promise<BurstResult> {
  return page.evaluate(
    async ({ childSel, ownerSel, deltas, gapMs }) => {
      const child = document.querySelector(childSel) as HTMLElement;
      const owner = document.querySelector(ownerSel) as HTMLElement;
      if (!child || !owner) throw new Error("missing child/owner");
      const start = owner.scrollTop;
      const prevented: boolean[] = [];
      const samples: number[] = [];
      for (const dy of deltas) {
        const ev = new WheelEvent("wheel", {
          deltaY: dy,
          deltaMode: 0,
          bubbles: true,
          cancelable: true,
          composed: true,
        });
        child.dispatchEvent(ev);
        prevented.push(ev.defaultPrevented);
        const until = performance.now() + gapMs;
        while (performance.now() < until) {
          await new Promise((r) => requestAnimationFrame(() => r(null)));
          samples.push(owner.scrollTop);
        }
      }
      for (let i = 0; i < 40; i += 1) {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        samples.push(owner.scrollTop);
      }
      return { start, end: owner.scrollTop, max: owner.scrollHeight - owner.clientHeight, prevented, samples };
    },
    { childSel, ownerSel, deltas, gapMs },
  );
}

function expectSmoothTravel(r: BurstResult, total: number) {
  expect(r.prevented[0], "first notch is consumed by the controller").toBe(true);
  expect(r.end).toBeCloseTo(Math.min(r.start + total, r.max), 0);
  const mid = r.samples.filter((v) => v > r.start + 1 && v < r.end - 1);
  expect(mid.length, "scroll passes through intermediate positions").toBeGreaterThanOrEqual(2);
  expect(r.end, "content actually moved").toBeGreaterThan(r.start + total * 0.9);
}

async function trackpadTail(page: Page, childSel: string, ownerSel: string) {
  return page.evaluate(
    async ({ childSel, ownerSel }) => {
      const child = document.querySelector(childSel) as HTMLElement;
      const owner = document.querySelector(ownerSel) as HTMLElement;
      const before = owner.scrollTop;
      const prevented: boolean[] = [];
      for (const dy of [9.5, 14.25, 11.75, 8.5, 6.25, 4.75, 3.5, 2.5]) {
        const ev = new WheelEvent("wheel", { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true, composed: true });
        child.dispatchEvent(ev);
        prevented.push(ev.defaultPrevented);
        await new Promise((r) => setTimeout(r, 16));
      }
      return { prevented, moved: owner.scrollTop - before };
    },
    { childSel, ownerSel },
  );
}

const MAC_MOUSE_BURSTS: Array<{ name: string; deltas: number[] }> = [
  { name: "single slow notch (8px)", deltas: [8] },
  { name: "single bigger notch (24px)", deltas: [24] },
  { name: "accelerated wheel", deltas: [4, 8, 16, 32, 48] },
  { name: "three even notches", deltas: [16, 16, 16] },
];

test("performance main page: mac-like pixel notches over content are smooth; trackpad tail stays native", async ({ page }) => {
  await setViewport(page, 1440, 700);
  await bootMetrio(page, "lead");
  const owner = ".metrio-scroll--primary";
  const child = `${owner} .performance-table, ${owner} h2, ${owner} p`;
  expect(await page.locator(owner).evaluate((el) => el.scrollHeight > el.clientHeight + 200)).toBe(true);
  const tp = await trackpadTail(page, child, owner);
  expect(tp.prevented.every((p) => !p)).toBe(true);
  await page.waitForTimeout(500);
  for (const burst of MAC_MOUSE_BURSTS) {
    await page.locator(owner).evaluate((el) => (el.scrollTop = 0));
    await page.waitForTimeout(450);
    const r = await pixelBurst(page, child, owner, burst.deltas);
    expectSmoothTravel(r, burst.deltas.reduce((a, b) => a + b, 0));
  }
});

test("REGRESSION: person drawer — wheel over nested content scrolls the drawer body (even if instant scrollTo is ignored)", async ({ page }) => {
  await emulateWebKitInstantIgnored(page);
  await setViewport(page, 1440, 480);
  await bootMetrio(page, "lead");
  await openDirectReportPersonDrawer(page);
  await page.waitForTimeout(800);
  const owner = ".drawer--person-detail .drawer__body";
  const child = ".drawer--person-detail .drawer__body .person-drawer-view--active *";
  expect(await page.locator(owner).evaluate((el) => el.scrollHeight > el.clientHeight + 200)).toBe(true);
  expect(await trackpadTail(page, child, owner)).toMatchObject({ prevented: Array(8).fill(false) });
  await page.waitForTimeout(500);
  const r = await pixelBurst(page, child, owner, [16, 16, 16]);
  expectSmoothTravel(r, 48);
});

test("REGRESSION: notifications drawer — wheel over a card scrolls the drawer body", async ({ page }) => {
  await emulateWebKitInstantIgnored(page);
  await setViewport(page, 1440, 430);
  await bootNotifications(page, "light");
  await page.getByRole("button", { name: /Notifications, \d+ unread/i }).click();
  await expect(page.locator(".drawer--notifications")).toBeVisible();
  await page.waitForTimeout(600);
  const owner = ".drawer--notifications .drawer__body";
  const child = ".drawer--notifications .notification-center__card *";
  for (const burst of MAC_MOUSE_BURSTS.slice(0, 3)) {
    await page.locator(owner).evaluate((el) => (el.scrollTop = 0));
    await page.waitForTimeout(450);
    const r = await pixelBurst(page, child, owner, burst.deltas);
    expect(r.prevented[0]).toBe(true);
    expect(r.end, burst.name).toBeGreaterThan(r.start + 3);
  }
  // reverse retargets immediately
  await page.locator(owner).evaluate((el) => (el.scrollTop = 0));
  await page.waitForTimeout(450);
  const fwd = await pixelBurst(page, child, owner, [40, 40]);
  const back = await pixelBurst(page, child, owner, [-40]);
  expect(back.end).toBeCloseTo(fwd.end - 40, 0);
  expect(await trackpadTail(page, child, owner)).toMatchObject({ prevented: Array(8).fill(false) });
});

test("an independently scrollable child consumes the wheel first; the drawer does not also move", async ({ page }) => {
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
    const ev = new WheelEvent("wheel", { deltaY: 40, deltaMode: 0, bubbles: true, cancelable: true });
    inner.dispatchEvent(ev);
    await new Promise((res) => setTimeout(res, 500));
    return { prevented: ev.defaultPrevented, outerDelta: body.scrollTop - before };
  });
  expect(r.prevented).toBe(false);
  expect(r.outerDelta).toBe(0);
});

test("reduced motion: no custom interpolation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setViewport(page, 1440, 700);
  await bootMetrio(page, "lead");
  const owner = ".metrio-scroll--primary";
  const r = await pixelBurst(page, `${owner} h2, ${owner} p`, owner, [24]);
  expect(r.prevented[0]).toBe(false);
});
