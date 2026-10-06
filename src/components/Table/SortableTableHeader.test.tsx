import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SortableTableHeader } from "./SortableTableHeader";

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
});
