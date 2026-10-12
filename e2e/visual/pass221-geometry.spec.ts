import { expect, test, type Page } from "@playwright/test";
import { buildDocSurveyData } from "../../src/fixtures/docFixtureData";
import { serializeFeedbackVisualPrefsForPlaywright } from "../../src/fixtures/feedbackWorkflowFixture";
import {
  bootConnected,
  bootOrgRoleScenario,
  clickSubnav,
  openPerformanceFromHome,
} from "./visualBoot";

/** PASS 22.1 — real-layout geometry contracts (jsdom cannot measure layout). */

async function box(page: Page, selector: string) {
  const handle = page.locator(selector).first();
  await expect(handle).toBeVisible();
  const rect = await handle.boundingBox();
  if (!rect) throw new Error(`No box for ${selector}`);
  return rect;
}

async function bootFeedbackDetail(page: Page, theme: "light" | "dark" = "light") {
  await page.addInitScript(
    ({ prefs, survey, themeId }: { prefs: string; survey: string; themeId: string }) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", themeId);
      localStorage.setItem("metrio-visual-preferences", prefs);
      localStorage.setItem("metrio-visual-survey-data", survey);
    },
    {
      prefs: serializeFeedbackVisualPrefsForPlaywright(),
      survey: JSON.stringify(buildDocSurveyData()),
      themeId: theme,
    },
  );
  await page.goto("/");
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^feedback$/i }).click();
  await page
    .getByTestId("feedback-cycle-card")
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.getByTestId("feedback-cycle-detail")).toBeVisible({ timeout: 15_000 });
}

test.describe("PASS 22.1 geometry", () => {
  test("Director scope strip is a horizontal module with the action on the right", async ({ page }) => {
    await bootOrgRoleScenario(page, "mom");
    await openPerformanceFromHome(page);
    await page.locator(".performance-subnav__link").filter({ hasText: "Overview" }).click();
    const strip = await box(page, '[data-testid="director-scope-header"]');
    const title = await box(page, ".performance-scope-strip__title");
    const action = await box(page, '[data-testid="director-scope-header"] button');
    expect(strip.height).toBeLessThan(80);
    expect(title.x - strip.x).toBeLessThan(24);
    expect(strip.x + strip.width - (action.x + action.width)).toBeLessThan(24);
    expect(Math.abs(action.y + action.height / 2 - (strip.y + strip.height / 2))).toBeLessThan(6);
  });

  test("IC performance context strip and Resources use canonical surfaces", async ({ page }) => {
    await bootOrgRoleScenario(page, "ic");
    await openPerformanceFromHome(page);
    const strip = await box(page, ".performance-scope-strip");
    expect(strip.height).toBeLessThan(80);
    const buttons = page.locator('[aria-label="Resources"] .btn');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i += 1) {
      await expect(buttons.nth(i)).toHaveClass(/btn--secondary/);
    }
    const heights = await buttons.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    expect(new Set(heights.map((h) => Math.round(h))).size).toBe(1);
  });

  test("IC dashboard manager card is a bounded surface", async ({ page }) => {
    await bootOrgRoleScenario(page, "ic");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const card = page.getByTestId("dashboard-your-manager");
    await expect(card).toBeVisible();
    const style = await card.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { border: cs.borderTopWidth, radius: cs.borderTopLeftRadius, padding: cs.paddingTop };
    });
    expect(style.border).toBe("1px");
    expect(parseFloat(style.radius)).toBeGreaterThan(0);
    expect(parseFloat(style.padding)).toBeGreaterThan(0);
    await expect(card.locator('[data-testid="person-avatar"]')).toBeVisible();
  });

  test("Task Path current marker ring stays inside the scroll container", async ({ page }) => {
    await bootConnected(page, "lead");
    await openPerformanceFromHome(page);
    await clickSubnav(page, /delivery risk/i);
    await page.getByRole("button", { name: "View journey" }).first().click();
    const scroll = page.getByTestId("task-journey-drawer");
    await expect(scroll).toBeVisible({ timeout: 15_000 });
    // The fixture issue has no changelog; render the real timeline classes inside the real drawer.
    await page.evaluate(() => {
      const section = document.querySelector('[aria-label="Task path"]')!;
      const list = document.createElement("ol");
      list.className = "task-journey-timeline";
      list.innerHTML = ["Open", "In progress", "In review"]
        .map(
          (stage, index, all) => `<li class="task-journey-timeline__item${index === all.length - 1 ? " task-journey-timeline__item--current" : ""}">
            <span class="task-journey-timeline__dot"></span><span class="task-journey-timeline__connector"></span>
            <div class="task-journey-timeline__title">${stage}</div>
            <div class="task-journey-timeline__meta">since 1 Oct</div></li>`,
        )
        .join("");
      section.appendChild(list);
    });
    const result = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="task-journey-drawer"]')!.getBoundingClientRect();
      const list = document.querySelector(".task-journey-timeline:last-of-type") as HTMLElement;
      const halo = parseFloat(getComputedStyle(list).getPropertyValue("--task-journey-marker-halo"));
      const items = Array.from(list.querySelectorAll(".task-journey-timeline__item"));
      return items.map((item) => {
        const dot = item.querySelector(".task-journey-timeline__dot")!.getBoundingClientRect();
        const title = item.querySelector(".task-journey-timeline__title")!.getBoundingClientRect();
        const ring = item.classList.contains("task-journey-timeline__item--current") ? halo : 0;
        return {
          left: dot.left - ring - root.left,
          right: root.right - (dot.right + ring),
          titleGap: title.left - dot.right,
        };
      });
    });
    expect(result).toHaveLength(3);
    for (const dot of result) {
      expect(dot.left).toBeGreaterThanOrEqual(0);
      expect(dot.right).toBeGreaterThanOrEqual(0);
    }
    expect(new Set(result.map((dot) => Math.round(dot.titleGap))).size).toBe(1);
  });

  test("Feedback cycle detail uses equal-height metric grids at supported heights", async ({ page }) => {
    await bootFeedbackDetail(page);
    for (const height of [600, 700, 760, 900]) {
      await page.setViewportSize({ width: 1440, height });
      const metrics = page.locator('[data-testid="feedback-cycle-detail"] .ds-metric-grid');
      const grids = await metrics.evaluateAll((els) =>
        els.map((grid) =>
          Array.from(grid.children).map((child) => Math.round(child.getBoundingClientRect().height)),
        ),
      );
      expect(grids.length).toBe(2);
      for (const heights of grids) {
        expect(new Set(heights).size).toBe(1);
      }
      const latest = await box(page, '[data-testid="feedback-latest-run"]');
      const actions = await box(page, ".feedback-latest-run__actions .btn");
      expect(actions.x - latest.x).toBeLessThan(40);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  test("Stacked form date trigger matches the Performance filter control geometry", async ({ page }) => {
    await bootConnected(page, "lead");
    await openPerformanceFromHome(page);
    await clickSubnav(page, /delivery risk/i);
    const filter = await box(page, ".metrio-date-picker__trigger");
    await page.getByRole("button", { name: "View journey" }).first().click();
    await expect(page.getByTestId("task-journey-drawer")).toBeVisible({ timeout: 15_000 });
    // Real stacked-layout markup (as rendered by MetrioDatePicker layout="stacked") in a real drawer body.
    await page.evaluate(() => {
      const holder = document.createElement("div");
      holder.innerHTML = `<div class="metrio-date-picker metrio-date-picker--stacked field" id="zz-stacked">
        <label class="field__label">Due date</label>
        <button type="button" class="metrio-date-picker__trigger metrio-field"><span class="metrio-date-picker__value">20 Oct 2026</span></button></div>
        <label class="field" id="zz-input"><span class="field__label">Title</span><input class="input metrio-field" value="x" /></label>`;
      document.querySelector('[data-testid="task-journey-drawer"]')!.appendChild(holder);
    });
    const stacked = await box(page, "#zz-stacked .metrio-date-picker__trigger");
    const input = await box(page, "#zz-input input");
    expect(stacked.height).toBe(filter.height);
    expect(stacked.height).toBe(input.height);
  });
});
