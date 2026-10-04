import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "../components/Drawer/Drawer";
import { Button } from "../components/Button/Button";

describe("Person drawer header actions", () => {
  it("renders Brief before Close in shared toolbar", () => {
    render(
      <Drawer
        open
        onClose={vi.fn()}
        ariaLabel="Person detail"
        header={<span>Identity</span>}
        headerActions={
          <Button type="button" variant="secondary">
            Brief
          </Button>
        }
      >
        <p>Body</p>
      </Drawer>,
    );
    const toolbar = document.querySelector(".drawer__header-toolbar");
    expect(toolbar).toBeTruthy();
    const buttons = toolbar!.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    expect(buttons[0]).toHaveTextContent("Brief");
    expect(buttons[buttons.length - 1]).toHaveAccessibleName(/Close drawer/i);
  });
});
