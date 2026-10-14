import { expect } from "@playwright/test";
import { test } from "./baseTest";
import { bootOrgRoleScenario, openPerformanceFromHome } from "./visualBoot";

/** Mounts a carousel with the REAL shared classes inside the running app (so shipped CSS applies). */
async function mountCarousel(page: import("@playwright/test").Page, count: number) {
  await page.evaluate((n) => {
    document.getElementById("pass34-host")?.remove();
    const host = document.createElement("div");
    host.id = "pass34-host";
    host.style.cssText = "position:fixed;left:24px;right:24px;top:80px;z-index:9999;background:var(--color-background)";
    host.innerHTML = `<ul class="executive-recommendations__list executive-recommendations__list--carousel" id="pass34-rail">${Array.from(
      { length: n },
      (_, i) => `<li class="executive-recommendations__item"><p class="executive-recommendations__title">Card ${i + 1}</p><p class="executive-recommendations__copy">Context for card ${i + 1}</p></li>`,
    ).join("")}</ul>`;
    document.body.appendChild(host);
  }, count);
}

async function layout(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const rail = document.getElementById("pass34-rail") as HTMLElement;
    const r = rail.getBoundingClientRect();
    const items = Array.from(rail.children).map((el) => {
      const b = el.getBoundingClientRect();
      return { l: b.left - r.left, r: b.right - r.left, w: b.width };
    });
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    const w = items[0]!.w;
    const peek = (r.width - 2 * w - 3 * gap) / 2; // derived from the shipped card width formula
    return { width: r.width, items, scrollLeft: rail.scrollLeft, max: rail.scrollWidth - rail.clientWidth, docOverflow: document.documentElement.scrollWidth - window.innerWidth, padStart: peek + gap, peek, gap };
  });
}

for (const width of [1280, 1440, 1728]) {
  test(`carousel edge peeks: start / intermediate / end (${width})`, async ({ page }) => {
    await bootOrgRoleScenario(page, "mom", { theme: "light", width });
    await openPerformanceFromHome(page);
    await mountCarousel(page, 6);
    await page.locator("#pass34-rail").evaluate((el) => ((el as HTMLElement).style.scrollBehavior = "auto"));

    // START: two full cards, a partial third on the right, nothing on the left.
    const start = await layout(page);
    expect(start.scrollLeft).toBe(0);
    expect(start.items[0]!.l).toBeGreaterThanOrEqual(0);
    expect(start.items[1]!.r).toBeLessThanOrEqual(start.width);
    const rightPeekStart = start.width - start.items[2]!.l;
    expect(start.peek).toBeGreaterThan(16);
    expect(rightPeekStart).toBeGreaterThan(8); // partial next card visible
    expect(start.items[2]!.r).toBeGreaterThan(start.width); // …but not a full card
    expect(start.docOverflow).toBeLessThanOrEqual(0);

    // INTERMEDIATE: snap card 2 to the start line (scroll-padding keeps the previous peek).
    await page.locator("#pass34-rail").evaluate((el, pad) => {
      const rail = el as HTMLElement;
      const target = rail.children[2] as HTMLElement;
      rail.scrollLeft = target.offsetLeft - pad;
    }, start.padStart);
    await page.waitForTimeout(400);
    const mid = await layout(page);
    const leftPeek = mid.items[1]!.r; // previous card's visible sliver
    const rightPeek = mid.width - mid.items[4]!.l;
    expect(leftPeek).toBeGreaterThan(8);
    expect(leftPeek).toBeLessThan(mid.items[1]!.w); // not a full card
    expect(rightPeek).toBeGreaterThan(8);
    expect(mid.items[4]!.r).toBeGreaterThan(mid.width);
    expect(Math.abs(leftPeek - start.peek)).toBeLessThanOrEqual(2); // symmetric, deliberate size
    expect(mid.docOverflow).toBeLessThanOrEqual(0);

    // END: left peek only, no fake right peek.
    await page.locator("#pass34-rail").evaluate((el) => ((el as HTMLElement).scrollLeft = 99999));
    await page.waitForTimeout(400);
    const end = await layout(page);
    expect(end.scrollLeft).toBe(end.max);
    expect(Math.abs(end.items[5]!.r - end.width)).toBeLessThanOrEqual(1);
    expect(end.items[4]!.r).toBeGreaterThan(0);
    expect(end.items[3]!.r).toBeGreaterThan(0);
    expect(end.items[4]!.l).toBeLessThan(end.items[5]!.l);
  });
}

test("single attention card spans the full row: content left, CTA right and vertically centred", async ({ page }) => {
  await bootOrgRoleScenario(page, "mom", { theme: "light", width: 1440 });
  await openPerformanceFromHome(page);
  const info = await page.evaluate(() => {
    document.getElementById("pass34-host")?.remove();
    const host = document.createElement("div");
    host.id = "pass34-host";
    host.style.cssText = "position:fixed;left:24px;right:24px;top:80px;z-index:9999;background:var(--color-background)";
    host.innerHTML = `<section data-testid="rec"><ul class="executive-recommendations__list executive-recommendations__list--single" style="--recommendation-count:1"><li class="executive-recommendations__item"><div class="executive-recommendations__body"><div class="executive-recommendations__head"><span>Critical</span></div><p class="executive-recommendations__title">Elena Rossi needs delivery attention</p><p class="executive-recommendations__copy">6 delivery-risk items across the branch.</p></div><button class="ui-button executive-recommendations__cta">Open Delivery Risk</button></li></ul></section>`;
    document.body.appendChild(host);
    const li = host.querySelector("li")!.getBoundingClientRect();
    const sec = host.querySelector("section")!.getBoundingClientRect();
    const btn = host.querySelector("button")!.getBoundingClientRect();
    const body = host.querySelector(".executive-recommendations__body")!.getBoundingClientRect();
    return { liW: li.width, secW: sec.width, btnMid: btn.top + btn.height / 2, liMid: li.top + li.height / 2, btnRight: li.right - btn.right, bodyLeft: body.left - li.left, btnLeft: btn.left - body.left };
  });
  expect(Math.abs(info.liW - info.secW)).toBeLessThanOrEqual(1);
  expect(Math.abs(info.btnMid - info.liMid)).toBeLessThanOrEqual(2);
  expect(info.btnRight).toBeGreaterThan(8);
  expect(info.btnRight).toBeLessThan(40);
  expect(info.btnLeft).toBeGreaterThan(info.liW / 2);
});

test("Director Teams: manager row expands to Team Leads, each expands to members; no left rail", async ({ page }) => {
  await bootOrgRoleScenario(page, "mom", { theme: "light", width: 1440 });
  await openPerformanceFromHome(page);
  await page.locator(".performance-subnav__link").filter({ hasText: "Teams" }).click();
  const toggles = page.getByTestId("leadership-branch-toggle");
  await expect(page.locator(".performance-subnav__link").filter({ hasText: "People" })).toHaveCount(0);
  test.skip((await toggles.count()) === 0, "visual scenario has no branch hierarchy; covered by unit + doc-fixture QA");
  const before = await toggles.count();
  await toggles.first().click();
  await page.waitForTimeout(500);
  const rows = page.getByTestId("leadership-branch-member-row");
  expect(await rows.count()).toBeGreaterThan(0);
  const shadow = await rows.first().locator("td").first().evaluate((td) => {
    const c = td.querySelector(".performance-branch-collapse__content");
    return c ? getComputedStyle(c).boxShadow : "none";
  });
  expect(shadow).toBe("none");
  expect(await toggles.count()).toBeGreaterThanOrEqual(before);
});
