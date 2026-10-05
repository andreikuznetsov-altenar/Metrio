import type { ActionItem } from "../../../domain/actions/actionTypes";
import {
  buildEmployeeExecutiveModel,
  type EmployeeExecutiveModel,
} from "../../../domain/home/executiveDashboardModel";
import type { DashboardSyncStatus } from "../../../domain/home/dashboardSyncStatus";
import type { HomePersonalWorkspace } from "../../../domain/home/homeTypes";
import type { TrendCardData } from "../../../domain/performance";
import type { WorkloadResult } from "../../../domain/workload/workloadEngine";
import type { PersonAvailability } from "../../../domain/people/types";
import { DashboardActionTabs } from "./DashboardActionTabs";
import { DashboardAttentionNow } from "./DashboardAttentionNow";
import { DashboardExecutiveHeader } from "./DashboardExecutiveHeader";
import { DashboardKpiStrip } from "./DashboardKpiStrip";
import { DashboardPrimaryTrend } from "./DashboardPrimaryTrend";
import { DashboardScopeHealthSummary } from "./DashboardScopeHealthSummary";
import { DashboardCompactRow } from "../../../components/DashboardCompactRow/DashboardCompactRow";
import { HomeGoalsSummaryCard } from "../HomeGoalsSummaryCard";
import type { summarizeGoalsForHome } from "../../../domain/goals/goalReview";

const QUEUE_PREVIEW = 5;
type GoalsHomeSummary = ReturnType<typeof summarizeGoalsForHome>;

export interface EmployeeExecutiveDashboardProps {
  greeting: string;
  activeJiraCount: number;
  newAssignmentCount: number;
  lastUpdatedAt: string | null;
  dashboardSyncStatus: DashboardSyncStatus | null;
  refreshing: boolean;
  onRefresh: () => void;
  personal: HomePersonalWorkspace;
  selfWorkload: WorkloadResult | null;
  selfAvailability?: PersonAvailability;
  trends: TrendCardData[];
  onOpenAction: (item: ActionItem) => void;
  actionOpenLabel: (item: ActionItem) => string;
  onOpenJiraAssignment: (issueKey: string) => void;
  onOpenMyWeek: () => void;
  goalsSummary: GoalsHomeSummary | null;
  goalsFeatureOn: boolean;
  goalsProminent: boolean;
}

export function EmployeeExecutiveDashboard({
  greeting,
  activeJiraCount,
  newAssignmentCount,
  lastUpdatedAt,
  dashboardSyncStatus,
  refreshing,
  onRefresh,
  personal,
  selfWorkload,
  selfAvailability,
  trends,
  onOpenAction,
  actionOpenLabel,
  onOpenJiraAssignment,
  onOpenMyWeek,
  goalsSummary,
  goalsFeatureOn,
  goalsProminent,
}: EmployeeExecutiveDashboardProps) {
  const model: EmployeeExecutiveModel = buildEmployeeExecutiveModel({
    performanceSnapshot: personal.performanceSnapshot,
    selfWorkload,
    selfAvailability,
    focus: personal.focus,
    trends,
  });

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
      <DashboardPrimaryTrend trends={model.trends} spanClass={model.trendSpanClass} />
      <DashboardAttentionNow items={model.attentionItems} />
      <DashboardActionTabs
        tabs={model.actionTabs}
        onOpenAction={onOpenAction}
        actionOpenLabel={actionOpenLabel}
        footerByTab={{
          focus:
            personal.focus.length > QUEUE_PREVIEW
              ? { label: "View all assignments", onClick: onOpenMyWeek }
              : undefined,
        }}
      />
      {personal.newAssignments.length > 0 ? (
        <section className="executive-dashboard__span-12 executive-panel" aria-label="New assignments">
          <h2 className="executive-panel__title">New assignments</h2>
          <div className="home-compact-rows">
            {personal.newAssignments.map((record) => (
              <DashboardCompactRow
                key={record.issueKey}
                subject={
                  <>
                    <span className="home-compact-rows__key">{record.issueKey}</span>
                    {record.title}
                  </>
                }
                actionLabel="Open Jira"
                onAction={() => void onOpenJiraAssignment(record.issueKey)}
              />
            ))}
          </div>
        </section>
      ) : null}
      {goalsFeatureOn && goalsSummary && goalsProminent ? (
        <div className="executive-dashboard__span-12">
          <HomeGoalsSummaryCard teamView={false} summary={goalsSummary} prominent />
        </div>
      ) : null}
      {goalsFeatureOn && goalsSummary && !goalsProminent ? (
        <div className="executive-dashboard__span-12 executive-lower-section">
          <HomeGoalsSummaryCard teamView={false} summary={goalsSummary} />
        </div>
      ) : null}
      {personal.knowledge.length > 0 ? (
        <div className="executive-dashboard__span-12 executive-lower-section">
          <p className="executive-secondary-line">Knowledge: {personal.knowledge[0]?.title}</p>
        </div>
      ) : null}
    </>
  );
}
