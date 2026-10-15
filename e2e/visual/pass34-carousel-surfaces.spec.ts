import { expect } from "@playwright/test";
import { test } from "./baseTest";
import { bootOrgRoleScenario, openPerformanceFromHome } from "./visualBoot";

/**
 * Mounts a carousel with the REAL shared classes in the real page structure: either the Performance
 * page (24px gutter, full width) or the centred Home page (max-width 1320, 20px gutter).
 */
async function mountCarousel(page: import("@playwright/test").Page, count: number, pageKind: "performance" | "home") {
  await page.evaluate(
    ({ n, kind }) => {
      document.getElementById("pass34-host")?.remove();
      const host = document.createElement("div");
      host.id = "pass34-host";
      host.style.cssText = "position:fixed;left:0;right:0;top:80px;z-index:9999;background:var(--color-background);overflow-x:hidden";
      const cards = Array.from(
        { length: n },
        (_, i) => `<li class="executive-recommendations__item"><p class="executive-recommendations__title">Card ${i + 1}</p><p class="executive-recommendations__copy">Context for card ${i + 1}</p></li>`,
      ).join("");
      const rail = `<section class="executive-dashboard__span-12 dashboard-section"><div class="executive-recommendations__nav-row" id="pass34-nav"><span class="executive-recommendations__nav"><button class="ui-button">‹</button><button class="ui-button">›</button></span></div><ul class="executive-recommendations__list executive-recommendations__list--carousel" id="pass34-rail">${cards}</ul></section>`;
      host.innerHTML =
        kind === "home"
          ? `<div class="home-page"><div class="executive-dashboard">${rail}</div></div>`
          : `<div class="performance-dashboard">${rail}</div>`;
      document.body.appendChild(host);
    },
    { n: count, kind: pageKind },
  );
}

async function layout(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const rail = document.getElementById("pass34-rail") as HTMLElement;
    const nav = document.getElementById("pass34-nav") as HTMLElement;
    const section = rail.parentElement as HTMLElement;
    const r = rail.getBoundingClientRect();
    const sec = section.getBoundingClientRect();
    const navR = nav.querySelector(".executive-recommendations__nav")!.getBoundingClientRect();
    const items = Array.from(rail.children).map((el) => {
      const b = el.getBoundingClientRect();
      return { l: b.left, r: b.right, w: b.width };
    });
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    const w = items[0]!.w;
    const content = sec.width; // the normal content width the card formula is relative to
    const peek = (content - 2 * w - 3 * gap) / 2;
    return {
      railL: r.left,
      railR: r.right,
      contentL: sec.left,
      contentR: sec.right,
      content,
      items,
      navRight: navR.right,
      scrollLeft: rail.scrollLeft,
      max: rail.scrollWidth - rail.clientWidth,
      docOverflow: document.documentElement.scrollWidth - window.innerWidth,
      viewport: window.innerWidth,
      padStart: sec.left - r.left + peek + gap,
      peek,
      gap,
      w,
    };
  });
}

for (const kind of ["performance", "home"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const width of [1280, 1440, 1728]) {
      test(`carousel is full-bleed: start / middle / end (${kind} ${theme} ${width})`, async ({ page }) => {
        await bootOrgRoleScenario(page, "mom", { theme, width });
        await openPerformanceFromHome(page);
        await mountCarousel(page, 6, kind);
        await page.locator("#pass34-rail").evaluate((el) => ((el as HTMLElement).style.scrollBehavior = "auto"));

        // The scroller itself spans the whole viewport; the content grid (section) stays inset.
        const start = await layout(page);
        expect(Math.abs(start.railL - 0)).toBeLessThanOrEqual(1);
        expect(Math.abs(start.railR - start.viewport)).toBeLessThanOrEqual(1);
        expect(start.contentL).toBeGreaterThan(8);
        // START: first card sits on the content grid, no fake previous fragment.
        expect(start.scrollLeft).toBe(0);
        expect(Math.abs(start.items[0]!.l - start.contentL)).toBeLessThanOrEqual(1);
        expect(start.items[1]!.r).toBeLessThanOrEqual(start.contentR + 1);
        // …the next card continues THROUGH the right gutter and is clipped only at the window edge.
        expect(start.items[2]!.l).toBeLessThan(start.contentR);
        expect(start.items[2]!.r).toBeGreaterThan(start.viewport);
        expect(start.viewport - start.items[2]!.l).toBeGreaterThan(start.viewport - start.contentR);
        // Card width/gap are the normal-content formula (unchanged): (content - 2 peek - 3 gap) / 2.
        expect(start.peek).toBeGreaterThanOrEqual(23.5);
        expect(start.peek).toBeLessThanOrEqual(48.5);
        expect(start.docOverflow).toBeLessThanOrEqual(0);
        // Controls stay on the content grid, not the window edge.
        expect(start.navRight).toBeLessThanOrEqual(start.contentR + 1);
        expect(start.navRight).toBeLessThan(start.viewport - 8);

        // MIDDLE: previous card continues through the left gutter to the window edge.
        await page.locator("#pass34-rail").evaluate((el, pad) => {
          const rail = el as HTMLElement;
          const target = rail.children[2] as HTMLElement;
          rail.scrollLeft = target.offsetLeft - pad;
        }, start.padStart);
        await page.waitForTimeout(400);
        const mid = await layout(page);
        const leftVisible = mid.items[1]!.r - 0; // visible part of the previous card (window edge = 0)
        expect(leftVisible).toBeGreaterThan(mid.contentL + 8); // reaches into / beyond the content boundary
        expect(mid.items[1]!.l).toBeLessThan(0); // clipped at the window edge, not at the content boundary
        expect(mid.items[4]!.l).toBeLessThan(mid.contentR);
        expect(mid.items[4]!.r).toBeGreaterThan(mid.viewport);
        expect(Math.abs(mid.items[2]!.l - (mid.contentL + mid.peek + mid.gap))).toBeLessThanOrEqual(2);
        expect(mid.docOverflow).toBeLessThanOrEqual(0);
        expect(Math.abs(mid.w - start.w)).toBeLessThanOrEqual(0.5); // no card width shift

        // END: last card aligned to the content grid, no fake next fragment.
        await page.locator("#pass34-rail").evaluate((el) => ((el as HTMLElement).scrollLeft = 99999));
        await page.waitForTimeout(400);
        const end = await layout(page);
        expect(end.scrollLeft).toBe(end.max);
        expect(Math.abs(end.items[5]!.r - end.contentR)).toBeLessThanOrEqual(1);
        expect(end.items[4]!.r).toBeGreaterThan(0);
        expect(end.items[4]!.l).toBeLessThan(end.items[5]!.l);
        expect(end.docOverflow).toBeLessThanOrEqual(0);
      });
    }
  }
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
