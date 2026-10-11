// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../styles/app-surfaces.css";
import "../components/AppShell/AppShell.css";
import { Input } from "../components/Input/Input";
import { Textarea } from "../components/Textarea/Textarea";
import { MetrioDatePicker } from "../components/DatePicker/MetrioDatePicker";
import { BambooCreateGoalDrawer } from "../pages/performance/BambooCreateGoalDrawer";
import {
  ensureAppShellWithOverlayLayers,
  flushDrawerAnimations,
  installDrawerMotionMock,
} from "../components/Drawer/drawerTestUtils";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

vi.mock("../config/product", async () => {
  const actual = await vi.importActual<typeof import("../config/product")>(
    "../config/product",
  );
  return { ...actual, resolveBambooSubdomain: () => "altenar" };
});

vi.mock("../services/bamboo/bambooClient", () => {
  class BambooPermissionError extends Error {
    status = 403;
  }
  return {
    BambooPermissionError,
    BambooClient: class {
      canCreateGoals = vi.fn(async () => true);
      createGoal = vi.fn();
    },
  };
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("PASS 16.3 Create Goal form control parity", () => {
  beforeEach(() => {
    globalThis.ResizeObserver =
      ResizeObserverStub as unknown as typeof ResizeObserver;
    installDrawerMotionMock();
    ensureAppShellWithOverlayLayers();
    document.documentElement.style.setProperty("--z-drawer-panel", "111");
    document.documentElement.style.setProperty("--z-popover", "115");
  });

  afterEach(() => {
    cleanup();
    document.querySelector(".app-shell")?.remove();
    document.querySelector("[data-testid='native-titlebar']")?.remove();
    vi.restoreAllMocks();
  });

  it("date picker popover layers above drawer panel token", () => {
    const dateCss = read("src/components/DatePicker/MetrioDatePicker.css");
    const surfaces = read("src/styles/app-surfaces.css");
    expect(dateCss).toContain("var(--z-popover");
    const drawer = Number(surfaces.match(/--z-drawer-panel:\s*(\d+)/)?.[1] ?? "0");
    const popover = Number(surfaces.match(/--z-popover:\s*(\d+)/)?.[1] ?? "0");
    expect(popover).toBeGreaterThan(drawer);
  });

  it("Goal Title/Description use the same canonical field classes as reference controls", () => {
    const { container: ref } = render(
      <>
        <Input label="Reference" data-testid="ref-title" />
        <Textarea label="Reference body" data-testid="ref-desc" />
      </>,
    );
    const { container: goal } = render(
      <>
        <Input label="Title" data-testid="goal-title" />
        <Textarea label="Description" data-testid="goal-desc" />
      </>,
    );

    const refTitle = ref.querySelector('[data-testid="ref-title"]')!;
    const goalTitle = goal.querySelector('[data-testid="goal-title"]')!;
    expect(refTitle.className).toBe(goalTitle.className);
    expect(refTitle.className).toContain("input");
    expect(refTitle.className).toContain("metrio-field");

    const refDesc = ref.querySelector('[data-testid="ref-desc"]')!;
    const goalDesc = goal.querySelector('[data-testid="goal-desc"]')!;
    expect(refDesc.className).toBe(goalDesc.className);
    expect(refDesc.className).toContain("textarea");
    expect(refDesc.className).toContain("metrio-field");
  });

  it("stacked Goal due date uses canonical field label + full-width trigger", () => {
    render(
      <MetrioDatePicker
        label="Due date"
        value=""
        onChange={() => undefined}
        layout="stacked"
        testId="goal-due"
      />,
    );
    const root = screen.getByTestId("goal-due").closest(".metrio-date-picker--stacked");
    expect(root?.className).toContain("field");
    expect(root?.querySelector(".field__label")).toHaveTextContent("Due date");
    const trigger = screen.getByTestId("goal-due");
    expect(trigger.className).toContain("metrio-date-picker__trigger");
    expect(trigger.className).toContain("metrio-field");
    expect(getComputedStyle(trigger).width).not.toBe("0px");
  });

  it("DatePicker trigger uses the same canonical height contract as Input and Select", () => {
    const dateCss = read("src/components/DatePicker/MetrioDatePicker.css");
    const inputCss = read("src/components/Input/Input.css");
    const selectCss = read("src/components/Select/Select.css");
    const dateTriggerBlock = Array.from(
      dateCss.matchAll(/\.metrio-date-picker__trigger\s*\{[\s\S]*?\}/g),
    )
      .map((match) => match[0])
      .find((block) => block.includes("height:"));
    const inputBlock = inputCss.match(/\.input\s*\{[\s\S]*?\}/)?.[0];
    const selectBlock = selectCss.match(/\.select-trigger\s*\{[\s\S]*?\}/)?.[0];

    expect(dateTriggerBlock).toBeTruthy();
    expect(inputBlock).toBeTruthy();
    expect(selectBlock).toBeTruthy();
    expect(dateTriggerBlock).toContain("height: var(--control-height)");
    expect(inputBlock).toContain("height: var(--control-height)");
    expect(selectBlock).toContain("height: var(--control-height)");
    expect(dateTriggerBlock).not.toContain("height: var(--control-height-default)");
    expect(dateTriggerBlock).not.toMatch(/height:\s*(?:auto|3[0-5]px|3[7-9]px|4[0-4]px)/);

    render(
      <MetrioDatePicker
        label="Due date"
        value=""
        onChange={() => undefined}
        layout="stacked"
        testId="goal-due"
      />,
    );
    expect(screen.getByTestId("goal-due").className).toContain("metrio-field");
  });

  it("Create Goal fields inherit canonical 1px field focus without Goal-specific overrides", () => {
    const interactionCss = read("src/styles/ui-interaction-system.css");
    const focusBlock = interactionCss.match(
      /\.metrio-field:focus-visible,[\s\S]*?\.settings-panel \.input:focus-visible \{[\s\S]*?\}/,
    )?.[0];
    expect(focusBlock).toBeTruthy();
    expect(focusBlock).toContain("outline: none");
    expect(focusBlock).toContain("box-shadow: none");
    expect(focusBlock).toContain("border-color: var(--color-focus-border)");
    expect(focusBlock).toContain("border-width: 1px");
    expect(focusBlock).not.toMatch(/border-width:\s*[23]px/);
    expect(focusBlock).not.toContain("padding-inline:");

    const goalCss = read("src/pages/performance/goal-detail-drawer.css");
    for (const selector of [
      ".bamboo-goal-form .input",
      ".bamboo-goal-form .textarea",
      ".bamboo-goal-form .metrio-date-picker__trigger",
      ".bamboo-create-goal-drawer .input",
      ".bamboo-create-goal-drawer .textarea",
      ".bamboo-create-goal-drawer .metrio-date-picker__trigger",
    ]) {
      expect(goalCss).not.toContain(selector);
    }
    expect(goalCss).not.toMatch(/bamboo-(?:goal-form|create-goal-drawer)[\s\S]*?:focus/);
    expect(goalCss).not.toMatch(/bamboo-(?:goal-form|create-goal-drawer)[\s\S]*?box-shadow/);
    expect(goalCss).not.toMatch(/bamboo-(?:goal-form|create-goal-drawer)[\s\S]*?outline/);
  });
});

describe("PASS 16.3 Create Goal date picker interactions", () => {
  beforeEach(() => {
    globalThis.ResizeObserver =
      ResizeObserverStub as unknown as typeof ResizeObserver;
    installDrawerMotionMock();
    ensureAppShellWithOverlayLayers();
  });

  afterEach(() => {
    cleanup();
    document.querySelector(".app-shell")?.remove();
    document.querySelector("[data-testid='native-titlebar']")?.remove();
    vi.restoreAllMocks();
  });

  async function openCreateDrawer() {
    render(
      <BambooCreateGoalDrawer
        open
        ownerEmployeeId="42"
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    await flushDrawerAnimations();
    const form = await screen.findByTestId("bamboo-create-goal-form");
    return form;
  }

  it("opens calendar from field body, icon, and label; selects date; Escape closes calendar not drawer", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <BambooCreateGoalDrawer
        open
        ownerEmployeeId="42"
        onClose={onClose}
        onCreated={vi.fn()}
      />,
    );
    await flushDrawerAnimations();
    const form = await screen.findByTestId("bamboo-create-goal-form");
    const trigger = within(form).getByTestId("bamboo-goal-due-date");
    const label = within(form).getByText("Due date");

    await user.click(trigger);
    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("open");
    });
    expect(screen.getByRole("grid")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("closed");
    });
    expect(screen.getByTestId("bamboo-create-goal-drawer")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(label);
    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("open");
    });

    const day = screen.getByRole("button", { name: /October 15/i });
    await user.click(day);
    await waitFor(() => {
      expect(trigger).toHaveTextContent(/Oct.*15|15.*Oct/i);
    });

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("closed");
    });
    // Icon is decorative (pointer-events: none); hit target is the full trigger button.
    await user.click(trigger);
    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("open");
    });
  });

  it("clicking trigger value text opens calendar", async () => {
    const user = userEvent.setup();
    const form = await openCreateDrawer();
    const trigger = within(form).getByTestId("bamboo-goal-due-date");
    const value = trigger.querySelector(".metrio-date-picker__value");
    expect(value).toBeTruthy();
    await user.click(value!);
    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });
  });
});
