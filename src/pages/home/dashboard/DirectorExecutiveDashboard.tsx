import type { ActionItem } from "../../../domain/actions/actionTypes";
import { buildDirectorExecutiveModel } from "../../../domain/home/executiveDashboardModel";
import type { DashboardSyncStatus } from "../../../domain/home/dashboardSyncStatus";
import type {
  HomeOrganizationWorkspace,
  HomePersonalWorkspace,
  HomeTeamWorkspace,
} from "../../../domain/home/homeTypes";
import type { TeamPerformanceSnapshot, TrendCardData } from "../../../domain/performance";
import { DashboardActionTabs } from "./DashboardActionTabs";
import { DashboardAttentionNow } from "./DashboardAttentionNow";
import { DashboardDeliveryVisual } from "./DashboardDeliveryVisual";
import { DashboardDirectorTeamHealthVisual } from "./DashboardDirectorTeamHealthVisual";
import { DashboardExecutiveHeader } from "./DashboardExecutiveHeader";
import { DashboardKpiStrip } from "./DashboardKpiStrip";
import { DashboardPrimaryTrend } from "./DashboardPrimaryTrend";
import { DashboardScopeHealthSummary } from "./DashboardScopeHealthSummary";
import { DashboardTeamCapacityVisual } from "./DashboardTeamCapacityVisual";
import type { DashboardPerformancePulseProps } from "./DashboardPerformancePulse";
import type { summarizeGoalsForHome } from "../../../domain/goals/goalReview";
import { HomeGoalsSummaryCard } from "../HomeGoalsSummaryCard";
import { Button } from "../../../components/Button/Button";
import { buildLeadershipRecommendations } from "../../../domain/recommendations/buildLeadershipRecommendations";
import { DashboardRecommendations } from "./DashboardRecommendations";
import type { ProductRecommendation } from "../../../domain/recommendations/buildProductRecommendations";
import { navigateProductRecommendation } from "../../../app/productRecommendationNavigation";

type GoalsHomeSummary = ReturnType<typeof summarizeGoalsForHome>;

export interface DirectorExecutiveDashboardProps {
  greeting: string;
  activeJiraCount: number;
  newAssignmentCount: number;
  lastUpdatedAt: string | null;
  dashboardSyncStatus: DashboardSyncStatus | null;
  refreshing: boolean;
  onRefresh: () => void;
  personal: HomePersonalWorkspace;
  team: HomeTeamWorkspace;
  organization: HomeOrganizationWorkspace;
  teamSnapshot: TeamPerformanceSnapshot | null;
  deliveryRiskCount: number;
  trends: TrendCardData[];
  onOpenAction: (item: ActionItem) => void;
  actionOpenLabel: (item: ActionItem) => string;
  onOpenTrendPoint?: DashboardPerformancePulseProps["onPointClick"];
  onOpenDeliveryRisk: () => void;
  onOpenDirectorView: () => void;
  goalsSummary: GoalsHomeSummary | null;
  goalsFeatureOn: boolean;
  goalsProminent: boolean;
  directIndividualContributorCount?: number;
  onAttentionView: (item: import("../../../domain/home/executiveDashboardModel").ExecutiveAttentionItem) => void;
  jiraBaseUrl?: string;
}

export function DirectorExecutiveDashboard({
  greeting,
  activeJiraCount,
  newAssignmentCount,
  lastUpdatedAt,
  dashboardSyncStatus,
  refreshing,
  onRefresh,
  personal,
  team,
  organization,
  teamSnapshot,
  deliveryRiskCount,
  trends,
  onOpenAction,
  actionOpenLabel,
  onOpenTrendPoint,
  onOpenDeliveryRisk,
  onOpenDirectorView,
  goalsSummary,
  goalsFeatureOn,
  goalsProminent,
  directIndividualContributorCount = 0,
  onAttentionView,
  jiraBaseUrl,
}: DirectorExecutiveDashboardProps) {
  const model = buildDirectorExecutiveModel({
    focus: personal.focus,
    teamActions: team.actions,
    teamSnapshot,
    deliveryRiskCount,
    deliverySummary: team.deliverySummary,
    organization,
    trends,
  });

  const branchRecommendations = buildLeadershipRecommendations({
    branches: organization.model.leadershipBranches ?? [],
    maxItems: 3,
  });

  const onRecommendationAction = (rec: ProductRecommendation) => {
    navigateProductRecommendation(rec, {
      openPerson: () => undefined,
      openJira: () => undefined,
    });
  };

  return (
    <>
      <div className="executive-dashboard__span-12">
        <DashboardExecutiveHeader
          greeting={greeting}
          scopeLabel={model.scopeLabel}
          activeJiraCount={activeJiraCount}
          newAssignmentCount={newAssignmentCount}
          lastUpdatedAt={lastUpdatedAt}
          dashboardSyncStatus={dashboardSyncStatus}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </div>
      <DashboardScopeHealthSummary scopeLabel={model.scopeLabel} summary={model.scopeHealth} />
      <DashboardKpiStrip cards={model.kpis} />
      {branchRecommendations.length > 0 ? (
        <DashboardRecommendations
          items={branchRecommendations}
          onAction={onRecommendationAction}
          surface="dashboard"
        />
      ) : null}
      <DashboardPrimaryTrend
        trends={model.trends}
        spanClass={model.trendSpanClass}
        onPointClick={onOpenTrendPoint}
      />
      <DashboardAttentionNow
        items={model.attentionItems}
        onView={onAttentionView}
        jiraBaseUrl={jiraBaseUrl}
      />
      {directIndividualContributorCount > 0 ? (
        <p
          className="executive-secondary-line executive-dashboard__span-12"
          data-testid="dashboard-direct-ic-note"
        >
          + {directIndividualContributorCount} direct contributor
          {directIndividualContributorCount === 1 ? "" : "s"} included in totals
        </p>
      ) : null}
      <DashboardDirectorTeamHealthVisual
        organization={organization}
        onOpenDirectorView={onOpenDirectorView}
      />
      <DashboardTeamCapacityVisual workload={model.teamWorkload} />
      <DashboardDeliveryVisual summary={model.deliverySummary} />
      <DashboardActionTabs
        tabs={model.actionTabs}
        onOpenAction={onOpenAction}
        actionOpenLabel={actionOpenLabel}
      />
      {goalsFeatureOn && goalsSummary && goalsProminent ? (
        <div className="executive-dashboard__span-12">
          <HomeGoalsSummaryCard teamView summary={goalsSummary} prominent />
        </div>
      ) : null}
      <div
        className="executive-dashboard__span-12"
        data-testid="dashboard-director-org"
      >
        <Button type="button" variant="secondary" onClick={onOpenDeliveryRisk}>
          Open delivery risk
        </Button>
      </div>
    </>
  );
}
