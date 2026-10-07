import { expect, test } from "@playwright/test";
import { bootMetrio, openDirectReportPersonDrawer } from "./visualBoot";

function parseDrawerTranslateX(transform: string): number {
  if (transform === "none") {
    return 0;
  }
  const matrix = transform.match(/matrix\([^,]+, [^,]+, [^,]+, [^,]+, ([^,]+),/);
  if (matrix) {
    return Number(matrix[1]);
  }
  const translate3d = transform.match(/translate3d\(([^,]+)/);
  if (translate3d) {
    const token = translate3d[1].trim();
    if (token.endsWith("%")) {
      return Number(token.replace("%", ""));
    }
    return Number(token);
  }
  return 0;
}

test.describe("Drawer motion and app-shell geometry", () => {
  test("drawer spans header bottom through viewport bottom and dims filters", async ({
    page,
  }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^performance$/i }).click();
    await openDirectReportPersonDrawer(page);
    const drawer = page.locator(".drawer--person-detail");
    await expect(drawer).toBeVisible();

    const geometry = await page.evaluate(() => {
      const header = document.querySelector(".app-shell__header");
      const toolbar = document.querySelector(".app-shell__page-toolbar");
      const panel = document.querySelector(".drawer.drawer--person-detail") as HTMLElement | null;
      const layer = document.getElementById("app-drawer-layer");
      if (!header || !toolbar || !panel || !layer) {
        return null;
      }
      const headerBox = header.getBoundingClientRect();
      const toolbarBox = toolbar.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const layerBox = layer.getBoundingClientRect();
      return {
        headerBottom: headerBox.bottom,
        layerTop: layerBox.top,
        panelTop: panelBox.top,
        layerBottom: layerBox.bottom,
        viewportBottom: window.innerHeight,
        toolbarTop: toolbarBox.top,
        toolbarBottom: toolbarBox.bottom,
        layerParent: layer.parentElement?.className ?? "",
      };
    });

    expect(geometry).not.toBeNull();
    expect(Math.abs(geometry!.layerTop - geometry!.headerBottom)).toBeLessThan(2);
    expect(Math.abs(geometry!.panelTop - geometry!.layerTop)).toBeLessThan(2);
    expect(Math.abs(geometry!.layerBottom - geometry!.viewportBottom)).toBeLessThan(2);
    expect(geometry!.toolbarTop).toBeGreaterThanOrEqual(geometry!.headerBottom - 1);
    expect(geometry!.toolbarBottom).toBeLessThan(geometry!.layerBottom);
    expect(geometry!.layerParent).toContain("app-shell");
  });

  test("drawer panel transform progresses on open and close", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^performance$/i }).click();
    const panel = page.locator(".drawer--person-detail");

    const sampleTransform = () =>
      panel.evaluate((el) => window.getComputedStyle(el).transform);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-person", { detail: "person-01" }),
      );
    });
    await page.waitForSelector(".drawer--person-detail", { state: "attached" });

    const t0 = parseDrawerTranslateX(await sampleTransform());
    await page.waitForTimeout(100);
    const t100 = parseDrawerTranslateX(await sampleTransform());
    await page.waitForTimeout(200);
    const t300 = parseDrawerTranslateX(await sampleTransform());
    expect(t0).toBeGreaterThan(50);
    expect(t300).toBeLessThan(3);
    expect(t100).toBeLessThan(t0);
    expect(t100).toBeGreaterThan(t300);
    await expect(panel).toBeVisible();

    const closeMotion = await page.evaluate(async () => {
      const backdrop = document.querySelector(
        ".drawer-root__backdrop",
      ) as HTMLButtonElement | null;
      backdrop?.click();
      const samples: number[] = [];
      const parseTx = (transform: string) => {
        if (transform === "none") return 0;
        const matrix = transform.match(
          /matrix\([^,]+, [^,]+, [^,]+, [^,]+, ([^,]+),/,
        );
        if (matrix) return Number(matrix[1]);
        const translate3d = transform.match(/translate3d\(([^,]+)/);
        if (translate3d) {
          const token = translate3d[1].trim();
          if (token.endsWith("%")) return Number(token.replace("%", ""));
          return Number(token);
        }
        return 0;
      };
      const start = performance.now();
      let mountedMs = 0;
      while (performance.now() - start < 2_000) {
        const panelEl = document.querySelector(
          ".drawer--person-detail",
        ) as HTMLElement | null;
        if (!panelEl) {
          mountedMs = performance.now() - start;
          break;
        }
        samples.push(parseTx(window.getComputedStyle(panelEl).transform));
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }
      return { samples, mountedMs };
    });
    expect(closeMotion.mountedMs).toBeGreaterThan(80);
    expect(closeMotion.mountedMs).toBeLessThan(1_500);
    expect(closeMotion.samples.length).toBeGreaterThan(5);
    const closingMax = Math.max(...closeMotion.samples);
    const closingStart = closeMotion.samples[0] ?? 0;
    const closingEnd = closeMotion.samples[closeMotion.samples.length - 1] ?? 0;
    expect(
      closingMax > 5 || closingEnd > closingStart || closeMotion.mountedMs > 200,
    ).toBe(true);
    await expect(panel).toHaveCount(0, { timeout: 500 });
  });
});
