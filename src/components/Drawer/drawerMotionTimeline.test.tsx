// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";
import {
  ensureAppDrawerLayer,
  flushDrawerAnimations,
  flushDrawerOpenFrames,
  installDrawerMotionMock,
  readDrawerPanelTranslateX,
  setDrawerMotionProgress,
} from "./drawerTestUtils";

const SAMPLES_MS = [0, 80, 160, 240, 320];

describe("Drawer motion timeline", () => {
  beforeEach(() => {
    installDrawerMotionMock();
    ensureAppDrawerLayer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.getElementById("app-drawer-layer")?.remove();
  });

  it("open: translateX progresses toward 0 without jumping to unmounted", async () => {
    render(
      <Drawer open onClose={vi.fn()} ariaLabel="Timeline drawer">
        Body
      </Drawer>,
    );
    const panel = screen.getByRole("dialog");
    await flushDrawerOpenFrames();
    const samples: number[] = [];
    for (const ms of SAMPLES_MS) {
      await setDrawerMotionProgress(ms / 320);
      samples.push(readDrawerPanelTranslateX(panel));
    }
    expect(samples[0]).toBeGreaterThanOrEqual(90);
    expect(samples[samples.length - 1]).toBeLessThan(5);
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1] + 1);
    }
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await flushDrawerAnimations();
    expect(readDrawerPanelTranslateX(panel)).toBeLessThan(1);
  });

  it("close: translateX progresses toward off-screen before unmount", async () => {
    const { rerender } = render(
      <Drawer open onClose={vi.fn()} ariaLabel="Timeline drawer">
        Body
      </Drawer>,
    );
    await flushDrawerOpenFrames();
    await flushDrawerAnimations();
    const panel = screen.getByRole("dialog");
    expect(readDrawerPanelTranslateX(panel)).toBeLessThan(1);

    rerender(
      <Drawer open={false} onClose={vi.fn()} ariaLabel="Timeline drawer">
        Body
      </Drawer>,
    );
    const samples: number[] = [];
    for (const ms of SAMPLES_MS) {
      await setDrawerMotionProgress(ms / 320);
      if (screen.queryByRole("dialog")) {
        samples.push(readDrawerPanelTranslateX(panel));
      }
    }
    expect(samples.length).toBeGreaterThan(0);
    expect(samples[0]).toBeLessThan(5);
    expect(samples[samples.length - 1]).toBeGreaterThanOrEqual(90);
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1] - 1);
    }
    await flushDrawerAnimations();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
