import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { buildDocBambooGoals, buildDocSurveyData } from "../../src/fixtures/docFixtureData";
import { serializeFeedbackVisualPrefsForPlaywright } from "../../src/fixtures/feedbackWorkflowFixture";
import { bootOrgRoleScenario, clickSubnav, openPerformanceFromHome } from "./visualBoot";

/** PASS 22.2 — real-layout contracts for goal drawer, Due date overlay, Feedback drawer, manager card. */

async function openGoalDrawer(page: Page, theme: "light" | "dark" = "light") {
  await page.addInitScript((goals: string) => {
    localStorage.setItem("metrio-visual-bamboo-goals", goals);
  }, JSON.stringify(buildDocBambooGoals("doc-maria")));
  await bootOrgRoleScenario(page, "ic", { theme });
  await openPerformanceFromHome(page);
  await clickSubnav(page, /^goals$/i);
  await page.getByTestId("bamboo-goal-open").first().click();
  await expect(page.getByTestId("bamboo-goal-detail")).toBeVisible();
}

test.describe("PASS 22.2 geometry", () => {
  test("goal drawer: title in header, summary as key/value rows, info block", async ({ page }) => {
    await openGoalDrawer(page);
    const drawer = page.getByTestId("bamboo-goal-detail-drawer");
    await expect(drawer.locator(".drawer__header .goal-drawer__title")).toHaveText(
      /Strengthen self-serve product flows/,
    );
    // The title is not repeated in the body.
    await expect(drawer.locator(".drawer__body h2")).toHaveCount(0);

    const rows = drawer.locator('[data-testid="bamboo-goal-summary"] .meta-list__row');
    expect(await rows.count()).toBeGreaterThanOrEqual(4);
    const boxes = await rows.evaluateAll((els) =>
      els.map((row) => {
        const label = row.querySelector("dt")!.getBoundingClientRect();
        const value = row.querySelector("dd")!.getBoundingClientRect();
        return { y: row.getBoundingClientRect().y, labelX: label.x, valueX: value.x };
      }),
    );
    for (let i = 1; i < boxes.length; i += 1) {
      expect(boxes[i].y).toBeGreaterThan(boxes[i - 1].y); // stacked
      expect(boxes[i].valueX).toBeCloseTo(boxes[0].valueX, 0); // one value column
      expect(boxes[i].valueX).toBeGreaterThan(boxes[i].labelX);
    }
    // Status is a tag, never plain text.
    await expect(
      drawer.locator('[data-testid="bamboo-goal-summary"] .meta-list__row').first().locator(".badge"),
    ).toHaveText(/In progress/i);
    // Description is the canonical info block.
    const info = drawer.getByTestId("bamboo-goal-description-view");
    await expect(info).toHaveClass(/info-block/);
    const background = await info.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).not.toBe("rgba(0, 0, 0, 0)");
    // Body starts directly under the header (no blank band).
    const header = await drawer.locator(".drawer__header").boundingBox();
    const summary = await drawer.getByTestId("bamboo-goal-summary").boundingBox();
    expect(summary!.y - (header!.y + header!.height)).toBeLessThan(40);
  });

  for (const height of [600, 700, 760, 900]) {
    test(`Due date calendar opens above the drawer, unclipped, at ${height}px height`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height });
      await openGoalDrawer(page);
      const trigger = page.getByTestId("bamboo-edit-due-date");
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      const popover = page.locator(".metrio-date-picker__popover");
      await expect(popover).toBeVisible();
      const box = (await popover.boundingBox())!;
      const viewport = page.viewportSize()!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

      // The calendar is the top-most element at each corner/center: nothing paints over it.
      const covered = await page.evaluate(() => {
        const pop = document.querySelector(".metrio-date-picker__popover")!;
        const r = pop.getBoundingClientRect();
        const points = [
          [r.x + 8, r.y + 8],
          [r.x + r.width - 8, r.y + 8],
          [r.x + 8, r.y + r.height - 8],
          [r.x + r.width - 8, r.y + r.height - 8],
          [r.x + r.width / 2, r.y + r.height / 2],
        ];
        return points.filter(([x, y]) => !pop.contains(document.elementFromPoint(x, y))).length;
      });
      expect(covered).toBe(0);

      // Canonical overlay layer: above the drawer layer, below tooltips; not an arbitrary z-index.
      const layer = await page.evaluate(() => {
        const wrapper = document.querySelector(".metrio-date-picker__popover")!.parentElement!;
        const drawerLayer = document.getElementById("app-drawer-layer")!;
        return {
          popover: Number(getComputedStyle(wrapper).zIndex),
          drawer: Number(getComputedStyle(drawerLayer).zIndex),
        };
      });
      expect(layer.popover).toBeGreaterThan(layer.drawer);
      expect(layer.popover).toBeLessThan(1000);

      // Month navigation and date selection work.
      const caption = popover.locator(".rdp-caption_label");
      const before = await caption.textContent();
      await popover.locator(".rdp-button_next, .rdp-nav button").last().click();
      await expect(caption).not.toHaveText(before ?? "");
      await popover.getByRole("gridcell").filter({ hasText: /^15$/ }).first().click();
      await expect(popover).toHaveCount(0);
      await expect(trigger).toContainText("15");
    });
  }

  test("Due date calendar closes with Escape", async ({ page }) => {
    await openGoalDrawer(page);
    await page.getByTestId("bamboo-edit-due-date").click();
    await expect(page.locator(".metrio-date-picker__popover")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".metrio-date-picker__popover")).toHaveCount(0);
    await expect(page.getByTestId("bamboo-goal-detail")).toBeVisible();
  });

  test("goal drawer body is the scroll owner and the last field is reachable at 600px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    await openGoalDrawer(page);
    const body = page.locator('[data-testid="bamboo-goal-detail-drawer"] .drawer__body');
    const owns = await body.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(owns).toBe(true);
    const headerBefore = await page.locator(".drawer__header").first().boundingBox();
    await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const headerAfter = await page.locator(".drawer__header").first().boundingBox();
    expect(headerAfter!.y).toBe(headerBefore!.y);
    await expect(page.getByTestId("bamboo-save-details")).toBeInViewport();
  });

  test("Feedback cycle drawer: hugging tabs and stacked key/value Latest run", async ({ page }) => {
    await page.addInitScript(
      ({ prefs, survey }: { prefs: string; survey: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", "lead");
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-visual-preferences", prefs);
        localStorage.setItem("metrio-visual-survey-data", survey);
      },
      {
        prefs: serializeFeedbackVisualPrefsForPlaywright(),
        survey: JSON.stringify(buildDocSurveyData()),
      },
    );
    await page.goto("/");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page
      .getByTestId("feedback-cycle-card")
      .first()
      .getByRole("button", { name: "Open", exact: true })
      .click();
    const detail = page.getByTestId("feedback-cycle-detail");
    await expect(detail).toBeVisible();

    const tabs = await detail.locator(".segmented-control").first().boundingBox();
    const container = await detail.boundingBox();
    expect(tabs!.width).toBeLessThan(container!.width * 0.6);
    expect(tabs!.x).toBeCloseTo(container!.x, 0);

    const rows = detail.locator('[data-testid="feedback-latest-run-meta"] .meta-list__row');
    await expect(rows).toHaveCount(5);
    const geometry = await rows.evaluateAll((els) =>
      els.map((row) => ({
        y: row.getBoundingClientRect().y,
        labelX: row.querySelector("dt")!.getBoundingClientRect().x,
        valueX: row.querySelector("dd")!.getBoundingClientRect().x,
      })),
    );
    for (let i = 1; i < geometry.length; i += 1) {
      expect(geometry[i].y).toBeGreaterThan(geometry[i - 1].y);
      expect(geometry[i].valueX).toBeCloseTo(geometry[0].valueX, 0);
    }
    await expect(rows.first().locator(".badge")).toHaveText("Active");
    await expect(detail.locator(".feedback-latest-run__grid")).toHaveCount(0);
    const created = await rows.nth(1).locator("dd").boundingBox();
    expect(created!.height).toBeLessThan(30); // single line, no orphan wrapping
    const actions = await detail.locator(".feedback-latest-run__actions .btn").evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().y),
    );
    expect(new Set(actions.map((y) => Math.round(y))).size).toBe(1);
  });

  test("IC manager e-mail is a text link inside the identity block", async ({ page }) => {
    await bootOrgRoleScenario(page, "ic");
    const card = page.getByTestId("dashboard-your-manager");
    await expect(card).toBeVisible();
    // The manager's e-mail is a text link under the identity (no separate button).
    const identity = (await card.locator(".person-identity").boundingBox())!;
    const email = card.getByTestId("dashboard-your-manager-email");
    await expect(email).toBeVisible();
    await expect(email).toHaveClass(/metrio-text-link/);
    await expect(email).toContainText("@");
    const link = (await email.boundingBox())!;
    expect(link.y).toBeGreaterThanOrEqual(identity.y);
  });
});
