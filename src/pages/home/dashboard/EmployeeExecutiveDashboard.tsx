import type { ActionItem } from "../../../domain/actions/actionTypes";
import { buildEmployeeDashboardKpis } from "../../../domain/home/buildDashboardKpis";
import type { DashboardSyncStatus } from "../../../domain/home/dashboardSyncStatus";
import type { HomePersonalWorkspace } from "../../../domain/home/homeTypes";
import { DashboardExecutiveHeader } from "./DashboardExecutiveHeader";
import { DashboardKpiStrip } from "./DashboardKpiStrip";
import { DashboardQueuePanel } from "./DashboardQueuePanel";
import { DashboardCompactRow } from "../../../components/DashboardCompactRow/DashboardCompactRow";
import { Button } from "../../../components/Button/Button";
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
  onOpenAction: (item: ActionItem) => void;
  actionOpenLabel: (item: ActionItem) => string;
  onOpenJiraAssignment: (issueKey: string) => void;
  onOpenMyWeek: () => void;
  onOpenPerformance: () => void;
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
  onOpenAction,
  actionOpenLabel,
  onOpenJiraAssignment,
  onOpenMyWeek,
  onOpenPerformance,
  goalsSummary,
  goalsFeatureOn,
  goalsProminent,
}: EmployeeExecutiveDashboardProps) {
  const kpis = buildEmployeeDashboardKpis(personal.performanceSnapshot.metrics);
  const focusPreview = personal.focus.slice(0, QUEUE_PREVIEW);

  return (
    <>
      <div className="executive-dashboard__span-12">
        <DashboardExecutiveHeader
          greeting={greeting}
          activeJiraCount={activeJiraCount}
          newAssignmentCount={newAssignmentCount}
          lastUpdatedAt={lastUpdatedAt}
          dashboardSyncStatus={dashboardSyncStatus}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </div>
      <DashboardKpiStrip cards={kpis} />
      <div className="executive-dashboard__span-12">
        <DashboardQueuePanel
          title="My focus"
          workColumnLabel="Work"
          items={focusPreview}
          emptyMessage="Nothing needs your attention right now."
          onOpen={onOpenAction}
          openLabel={actionOpenLabel}
          testId="dashboard-my-focus"
          footerAction={
            personal.focus.length > QUEUE_PREVIEW
              ? { label: "View all assignments", onClick: onOpenMyWeek }
              : undefined
          }
        />
      </div>
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
      <div className="executive-dashboard__span-12 executive-lower-section">
        {personal.knowledge.length > 0 ? (
          <p className="executive-secondary-line">Knowledge: {personal.knowledge[0]?.title}</p>
        ) : null}
        {goalsFeatureOn && goalsSummary && !goalsProminent ? (
          <HomeGoalsSummaryCard teamView={false} summary={goalsSummary} />
        ) : null}
        <Button type="button" variant="secondary" onClick={onOpenPerformance}>
          Open Performance
        </Button>
      </div>
    </>
  );
}
