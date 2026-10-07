// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardRecommendations } from "./DashboardRecommendations";
import type { ProductRecommendation } from "../../../domain/recommendations/buildProductRecommendations";

describe("DashboardRecommendations navigation", () => {
  it("invokes onAction when Open Performance is clicked", async () => {
    const onAction = vi.fn();
    const item: ProductRecommendation = {
      id: "backflow-review",
      severity: "watch",
      title: "Review recurring backflow",
      explanation: "Review why work returned from review/QA.",
      actionLabel: "Open Performance",
      actionKind: "open_performance",
      priority: 7,
    };
    render(<DashboardRecommendations items={[item]} onAction={onAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Open Performance" }));
    expect(onAction).toHaveBeenCalledWith(item);
  });

  it("invokes onAction when View person is clicked", async () => {
    const onAction = vi.fn();
    const item: ProductRecommendation = {
      id: "leave-handover",
      severity: "watch",
      title: "Hand over review work",
      explanation: "Reassign before leave.",
      actionLabel: "View person",
      actionKind: "view_person",
      personId: "person-01",
      priority: 3,
    };
    render(<DashboardRecommendations items={[item]} onAction={onAction} />);
    await userEvent.click(screen.getByRole("button", { name: "View person" }));
    expect(onAction).toHaveBeenCalledWith(item);
  });
});
