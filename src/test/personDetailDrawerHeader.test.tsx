import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "../components/Drawer/Drawer";
import { SegmentedControl } from "../components/SegmentedControl/SegmentedControl";

describe("Person drawer header actions", () => {
  it("renders Profile/Brief tabs before Close in shared toolbar", () => {
    render(
      <Drawer
        open
        onClose={vi.fn()}
        ariaLabel="Person detail"
        header={<span>Identity</span>}
        headerActions={
          <SegmentedControl
            ariaLabel="Person drawer view"
            className="person-drawer-view-tabs"
            options={[
              { value: "profile", label: "Profile" },
              { value: "brief", label: "Brief" },
            ]}
            value="profile"
            onChange={() => undefined}
          />
        }
      >
        <p>Body</p>
      </Drawer>,
    );
    const toolbar = document.querySelector(".drawer__header-toolbar");
    expect(toolbar).toBeTruthy();
    expect(toolbar!.querySelector(".person-drawer-view-tabs")).toBeTruthy();
    const buttons = toolbar!.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    expect(buttons[buttons.length - 1]).toHaveAccessibleName(/Close drawer/i);
  });

  it("person drawer view tabs use the same control-height token as close icon-btn", () => {
    const drawerCss = readFileSync(
      resolve(import.meta.dirname, "../pages/performance/person-detail-drawer.css"),
      "utf8",
    );
    const iconCss = readFileSync(
      resolve(import.meta.dirname, "../components/IconButton/IconButton.css"),
      "utf8",
    );
    const tabsRule = drawerCss.match(
      /\.drawer--person-detail \.person-drawer-view-tabs \{[\s\S]*?\}/,
    )?.[0];
    expect(tabsRule).toBeTruthy();
    expect(tabsRule).toMatch(/height:\s*var\(--control-height\)/);
    expect(tabsRule).not.toMatch(/control-height\)\s*-\s*\d/);
    expect(iconCss).toMatch(/\.icon-btn\s*\{[\s\S]*height:\s*var\(--control-height\)/);
    const drawerShellCss = readFileSync(
      resolve(import.meta.dirname, "../components/Drawer/Drawer.css"),
      "utf8",
    );
    expect(drawerShellCss).toMatch(
      /\.drawer__header-toolbar[\s\S]*gap:\s*var\(--button-group-gap\)/,
    );
  });
});
