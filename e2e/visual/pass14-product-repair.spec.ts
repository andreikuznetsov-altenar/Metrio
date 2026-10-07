import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  bootDashboardManager,
  bootMetrio,
  bootMetrioWithFlags,
  clickSettingsSection,
  clickSubnav,
  openFirstAttentionPerson,
  setViewport,
  VISUAL_EPHEMERAL_STORAGE_KEYS,
} from "./visualBoot";

const REPORT_FIXTURE = [
  {
    id: "pass14-report",
    filename: "metrio-pass14-team-report.pdf",
    createdAt: "2026-10-07T09:00:00.000Z",
  },
];

async function bootDelayedDashboard(page: Page) {
  await setViewport(page, 1440, 900);
  await page.addInitScript(
    ({ ephemeralKeys }: { ephemeralKeys: string[] }) => {
      for (const key of ephemeralKeys) localStorage.removeItem(key);
      sessionStorage.clear();
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-performance-delay-ms", "1500");
    },
    { ephemeralKeys: [...VISUAL_EPHEMERAL_STORAGE_KEYS] },
  );
  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 15_000 });
}

async function assertNoHorizontalOverflow(locator: Locator) {
  await expect(locator).toBeVisible({ timeout: 15_000 });
  const geometry = await locator.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    offenders: Array.from(node.querySelectorAll<HTMLElement>("*"))
      .filter(
        (child) =>
          child.getBoundingClientRect().right >
          node.getBoundingClientRect().right + 1,
      )
      .slice(0, 8)
      .map((child) => ({
        className: child.className,
        tagName: child.tagName,
        right: child.getBoundingClientRect().right,
        width: child.getBoundingClientRect().width,
      })),
  }));
  expect(geometry.scrollWidth, JSON.stringify(geometry)).toBeLessThanOrEqual(
    geometry.clientWidth + 1,
  );
}

async function seedRecommendation(
  page: Page,
  recommendation: Record<string, unknown>,
) {
  await page.addInitScript((value) => {
    localStorage.setItem(
      "metrio-visual-product-recommendations",
      JSON.stringify([value]),
    );
  }, recommendation);
}

test.describe("PASS 14 product repair", () => {
  test("startup loader disables Performance and Feedback, then enables default 3m", async ({
    page,
  }) => {
    await bootDelayedDashboard(page);
    await expect(page.getByTestId("dashboard-workspace-loading")).toBeVisible();

    const performance = page.getByRole("button", { name: /^Performance$/i });
    const feedback = page.getByRole("button", { name: /^Feedback$/i });
    await expect(performance).toHaveAttribute("aria-disabled", "true");
    await expect(feedback).toHaveAttribute("aria-disabled", "true");
    await performance.click({ force: true });
    await feedback.press("Enter");
    await expect(page.getByTestId("dashboard-workspace-loading")).toBeVisible();

    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(performance).not.toHaveAttribute("aria-disabled", "true");
    await expect(feedback).not.toHaveAttribute("aria-disabled", "true");
    await performance.click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Last 3 months", { exact: true }).first()).toBeVisible();
  });

  test("My Focus Jira key is a real Jira link", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-visual-visualDashboardIssueLink", "1");
    });
    await bootDashboardManager(page);
    await page.getByRole("tab", { name: /my focus/i }).click();
    const panel = page.getByTestId("dashboard-tab-focus");
    const issue = panel.locator('a[href*="/browse/"]').first();
    await expect(issue).toBeVisible({ timeout: 15_000 });
    await expect(issue).toHaveAttribute("href", /\/browse\/[A-Z][A-Z0-9]+-\d+$/);
  });

  test("View person opens the intended Person Detail drawer", async ({ page }) => {
    await seedRecommendation(page, {
      id: "pass14-view-person",
      severity: "watch",
      title: "Review UX-5808 with Mia",
      explanation: "Open the owner profile.",
      actionLabel: "View person",
      actionKind: "view_person",
      personId: "person-01",
      priority: 1,
    });
    await bootDashboardManager(page);
    await page
      .getByTestId("dashboard-recommendations")
      .getByRole("button", { name: /^View person$/i })
      .click();
    const drawer = page.getByTestId("person-detail-drawer");
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    await expect(drawer.getByText("Mia Chen", { exact: true }).first()).toBeVisible();
  });

  test("Open Performance routes to Performance Overview", async ({ page }) => {
    await seedRecommendation(page, {
      id: "pass14-open-performance",
      severity: "watch",
      title: "Review recurring backflow",
      explanation: "Inspect the team trend.",
      actionLabel: "Open Performance",
      actionKind: "open_performance",
      priority: 1,
    });
    await bootDashboardManager(page);
    await page
      .getByTestId("dashboard-recommendations")
      .getByRole("button", { name: /^Open Performance$/i })
      .click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator(".performance-subnav").getByRole("button", { name: /^Overview$/i }),
    ).toHaveClass(/is-active/);
  });

  for (const width of [1280, 1440, 1728]) {
    test(`Team actions sort icon remains label-adjacent at ${width}px`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        localStorage.setItem("metrio-visual-visualDashboardIssueLink", "1");
      });
      await bootDashboardManager(page, { width });
      const table = page.getByTestId("dashboard-action-queue").first();
      const header = table.locator("thead th").first();
      const label = header.locator(".performance-table__sort-label");
      const icon = header.locator(".performance-table__sort-icon");
      await expect(label).toBeVisible();
      await expect(icon).toBeVisible();
      const [headerBox, labelBox, iconBox] = await Promise.all([
        header.boundingBox(),
        label.boundingBox(),
        icon.boundingBox(),
      ]);
      expect(headerBox && labelBox && iconBox).toBeTruthy();
      expect(iconBox!.x - (labelBox!.x + labelBox!.width)).toBeGreaterThanOrEqual(6);
      expect(iconBox!.x - (labelBox!.x + labelBox!.width)).toBeLessThanOrEqual(10);
      expect(iconBox!.x + iconBox!.width).toBeLessThanOrEqual(
        headerBox!.x + headerBox!.width + 1,
      );
    });
  }

  test("Delivery Risk and Radar fit without horizontal scroll", async ({ page }) => {
    await setViewport(page, 1280, 900);
    await bootMetrio(page);
    await clickSubnav(page, /Delivery Risk/i);
    await assertNoHorizontalOverflow(
      page.locator(".performance-table-wrap--delivery-risk"),
    );
    await clickSubnav(page, /^Radar$/i);
    await assertNoHorizontalOverflow(page.locator(".performance-table-wrap--radar"));
  });

  test("History report fits and exposes Download as a button", async ({ page }) => {
    await page.addInitScript((reports) => {
      localStorage.setItem("metrio-visual-report-history", JSON.stringify(reports));
    }, REPORT_FIXTURE);
    await setViewport(page, 1280, 900);
    await bootMetrio(page);
    await clickSubnav(page, /History reports/i);
    await assertNoHorizontalOverflow(
      page.locator(".performance-table-wrap--report-history"),
    );
    await expect(page.getByRole("button", { name: /^Download$/i })).toBeVisible();
  });

  test("Settings omits Support and keeps cache action compact", async ({ page }) => {
    await bootDashboardManager(page);
    await page.getByRole("button", { name: /^Settings$/i }).click();
    await clickSettingsSection(page, /Company & App/i);
    await expect(page.getByTestId("diagnostics-support-settings")).toHaveCount(0);
    await expect(page.getByText(/^Support$/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Show advanced details/i })).toHaveCount(0);
    const button = page.getByRole("button", { name: /Clear temporary caches/i });
    const card = page.getByTestId("settings-cache-clear");
    const [buttonBox, cardBox] = await Promise.all([
      button.boundingBox(),
      card.boundingBox(),
    ]);
    expect(buttonBox && cardBox).toBeTruthy();
    expect(buttonBox!.width).toBeLessThan(cardBox!.width * 0.75);
  });

  test("drawer backdrop includes app header and close waits for exit motion", async ({
    page,
  }) => {
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    const root = page.getByTestId("person-detail-drawer");
    await expect(root).toHaveAttribute("data-drawer-phase", "open", {
      timeout: 15_000,
    });
    const geometry = await page.evaluate(() => {
      const header = document.querySelector(".app-shell__header")!;
      const layer = document.getElementById("app-drawer-layer")!;
      const backdrop = document.querySelector(".drawer-root__backdrop")!;
      return {
        headerTop: header.getBoundingClientRect().top,
        layerTop: layer.getBoundingClientRect().top,
        backdropTop: backdrop.getBoundingClientRect().top,
        backdropBottom: backdrop.getBoundingClientRect().bottom,
        headerBottom: header.getBoundingClientRect().bottom,
        opacity: Number(getComputedStyle(backdrop).opacity),
      };
    });
    expect(Math.abs(geometry.layerTop - geometry.headerTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.backdropTop - geometry.headerTop)).toBeLessThanOrEqual(1);
    expect(geometry.backdropBottom).toBeGreaterThan(geometry.headerBottom);
    expect(geometry.opacity).toBeGreaterThan(0);

    await page
      .locator(".drawer--person-detail")
      .getByRole("button", { name: /Close/i })
      .click();
    await expect(root).toHaveAttribute("data-drawer-phase", "exiting");
    await page.waitForTimeout(120);
    await expect(root).toBeAttached();
    await expect(root).toHaveCount(0, { timeout: 1_000 });
  });

  test("task modal opened from Person drawer stays above it with enriched metadata", async ({
    page,
  }) => {
    await bootMetrioWithFlags(page, { groupedTasks: true });
    await openFirstAttentionPerson(page);
    const drawer = page.locator(".drawer--person-detail");
    const grouped = drawer.getByTestId("grouped-issue-count-link").first();
    await expect(grouped).toBeVisible({ timeout: 15_000 });
    await grouped.click();
    const modal = page.getByTestId("task-list-modal");
    await expect(modal).toBeVisible();
    const layers = await page.evaluate(() => ({
      drawer: Number(getComputedStyle(document.getElementById("app-drawer-layer")!).zIndex),
      modal: Number(getComputedStyle(document.getElementById("app-modal-layer")!).zIndex),
    }));
    expect(layers.modal).toBeGreaterThan(layers.drawer);
    const firstRow = modal.locator("tbody tr").first();
    await expect(firstRow.locator('a[href*="/browse/"]')).toBeVisible();
    const cells = firstRow.locator("td");
    await expect(cells.nth(1)).not.toHaveText(/^(—|[A-Z][A-Z0-9]+-\d+)$/);
    await expect(cells.nth(2)).not.toHaveText(/^—$/);
    await expect(cells.nth(3)).not.toHaveText(/^—$/);
    await expect(cells.nth(4)).not.toHaveText(/^—$/);
    await page
      .getByRole("dialog")
      .filter({ has: modal })
      .getByRole("button", { name: /^Close$/i })
      .click();
    await expect(modal).toHaveCount(0);
    await expect(drawer).toBeVisible();
  });
});
