import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SortableTableHeader } from "./SortableTableHeader";
import "../../pages/performance/performance-dashboard.css";

describe("SortableTableHeader", () => {
  it("reserves a fixed sort indicator slot for none/asc/desc", () => {
    const { rerender, container } = render(
      <table>
        <thead>
          <tr>
            <SortableTableHeader
              columnId="work"
              label="Work"
              sort={null}
              onToggle={() => {}}
            />
          </tr>
        </thead>
      </table>,
    );
    const icon = () => container.querySelector(".performance-table__sort-icon");
    expect(icon()?.textContent).toBe("↕");
    rerender(
      <table>
        <thead>
          <tr>
            <SortableTableHeader
              columnId="work"
              label="Work"
              sort={{ columnId: "work", direction: "asc" }}
              onToggle={() => {}}
            />
          </tr>
        </thead>
      </table>,
    );
    expect(icon()?.textContent).toBe("↑");
    rerender(
      <table>
        <thead>
          <tr>
            <SortableTableHeader
              columnId="work"
              label="Work"
              sort={{ columnId: "work", direction: "desc" }}
              onToggle={() => {}}
            />
          </tr>
        </thead>
      </table>,
    );
    expect(icon()?.textContent).toBe("↓");
    expect(container.querySelectorAll(".performance-table__sort-icon")).toHaveLength(1);
  });

  it("uses inline-flex sort control grouped with 8px gap", () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <SortableTableHeader
              columnId="work"
              label="Work"
              sort={{ columnId: "work", direction: "asc" }}
              onToggle={() => {}}
            />
          </tr>
        </thead>
      </table>,
    );
    const btn = container.querySelector(".performance-table__sort-btn");
    expect(btn).toBeTruthy();
    const styles = getComputedStyle(btn!);
    expect(styles.display).toBe("inline-flex");
    expect(["8px", "var(--space-2)"].includes(styles.gap)).toBe(true);
    expect(styles.width).toBe("auto");
  });
});
