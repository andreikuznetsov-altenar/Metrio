// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardYourManagerCard } from "../pages/home/dashboard/DashboardYourManagerCard";
import { resolveOrgFeatureAccess } from "../domain/organization/orgFeatureAccess";

describe("org role feature gates", () => {
  it("hides survey management for individual contributor", () => {
    const access = resolveOrgFeatureAccess("individual_contributor");
    expect(access.canViewSurveyManagement).toBe(false);
    expect(access.canViewManagerContact).toBe(true);
  });

  it("shows survey management for leaf manager", () => {
    const access = resolveOrgFeatureAccess("leaf_manager");
    expect(access.canViewSurveyManagement).toBe(true);
  });

  it("hides feedback tab for manager of managers", () => {
    const access = resolveOrgFeatureAccess("manager_of_managers");
    expect(access.showFeedbackTab).toBe(false);
    expect(access.usesLeadershipBranchView).toBe(true);
  });

  it("renders manager contact card for IC", () => {
    render(
      <DashboardYourManagerCard
        manager={{
          id: "m1",
          displayName: "Lead Person",
          firstName: "Lead",
          lastName: "Person",
          workEmail: "lead@company.com",
          jobTitle: "UX Team Leader",
          department: "UX Design",
          status: "active",
        }}
      />,
    );
    expect(screen.getByTestId("dashboard-your-manager")).toBeInTheDocument();
    expect(screen.getByText("lead@company.com")).toBeInTheDocument();
    expect(screen.queryByText(/Phone:/)).toBeNull();
  });
});
