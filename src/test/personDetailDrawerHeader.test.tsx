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
});
