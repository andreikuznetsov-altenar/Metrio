import type { ActionItem } from "../../../domain/actions/actionTypes";
import {
  buildEmployeeExecutiveModel,
  type EmployeeExecutiveModel,
} from "../../../domain/home/executiveDashboardModel";
import type { DashboardSyncStatus } from "../../../domain/home/dashboardSyncStatus";
import type { HomePersonalWorkspace } from "../../../domain/home/homeTypes";
import type { TrendCardData } from "../../../domain/performance";
import type { WorkloadResult } from "../../../domain/workload/workloadEngine";
import type { Person, PersonAvailability } from "../../../domain/people/types";
import { RecommendedActionsSection } from "./RecommendedActionsSection";
import { DashboardActionTabs } from "./DashboardActionTabs";
import { DashboardAttentionNow } from "./DashboardAttentionNow";
import { DashboardExecutiveHeader } from "./DashboardExecutiveHeader";
import { DashboardKpiStrip } from "./DashboardKpiStrip";
import { DashboardScopeHealthSummary } from "./DashboardScopeHealthSummary";
import { DashboardCompactRow } from "../../../components/DashboardCompactRow/DashboardCompactRow";
import { JiraIssueLink } from "../../../components/JiraIssueLink/JiraIssueLink";
import { HomeGoalsSummaryCard } from "../HomeGoalsSummaryCard";
import type { summarizeGoalsForHome } from "../../../domain/goals/goalReview";
import { DashboardYourManagerCard } from "./DashboardYourManagerCard";
import type { ResolvedEmployee } from "../../../services/bamboo/orgResolver";
import { DashboardEmployeeWorkSummary } from "./DashboardEmployeeWorkSummary";
import { openExternalUrl } from "../../../platform/openExternal";

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
  /** Signed-in person: source of own tasks / leave / workload for Recommended actions. */
  selfPerson?: Person | null;
  onOpenPerson?: (personId: string) => void;
  trends: TrendCardData[];
  onOpenAction: (item: ActionItem) => void;
  actionOpenLabel: (item: ActionItem) => string;
  onOpenJiraAssignment: (issueKey: string) => void;
  onOpenMyWeek: () => void;
  goalsSummary: GoalsHomeSummary | null;
  goalsFeatureOn: boolean;
  goalsProminent: boolean;
  showManagerCard?: boolean;
  managerContact?: ResolvedEmployee | null;
  selfDepartment?: string;
  onAttentionView: (item: import("../../../domain/home/executiveDashboardModel").ExecutiveAttentionItem) => void;
  jiraBaseUrl?: string;
  onOpenTrendPoint?: import("./DashboardPerformancePulse").DashboardPerformancePulseProps["onPointClick"];
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
  selfPerson = null,
  onOpenPerson,
  trends,
  onOpenAction,
  actionOpenLabel,
  onOpenJiraAssignment,
  onOpenMyWeek,
  goalsSummary,
  goalsFeatureOn,
  goalsProminent,
  showManagerCard = false,
  managerContact,
  selfDepartment,
  onAttentionView,
  jiraBaseUrl,
  onOpenTrendPoint,
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
      <RecommendedActionsSection
        scope="employee"
        ownPerson={selfPerson}
        jiraBaseUrl={jiraBaseUrl}
        onOpenPerson={(personId) => onOpenPerson?.(personId)}
        onOpenTeamWorkload={onOpenMyWeek}
        onOpenMyWork={onOpenMyWeek}
      />
      {showManagerCard ? (
        <div className="executive-dashboard__span-12">
          <DashboardYourManagerCard
            manager={managerContact}
            selfDepartment={selfDepartment}
          />
        </div>
      ) : null}
      <DashboardKpiStrip cards={model.kpis} />
      <DashboardEmployeeWorkSummary
        trends={model.trends}
        metrics={personal.performanceSnapshot.metrics}
        workload={selfWorkload}
        resources={personal.knowledge}
        onOpenResource={(url) => void openExternalUrl(url)}
        onPointClick={onOpenTrendPoint}
      />
      <DashboardAttentionNow
        items={model.attentionItems}
        onView={onAttentionView}
        jiraBaseUrl={jiraBaseUrl}
      />
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
                    <JiraIssueLink
                      issueKey={record.issueKey}
                      jiraBaseUrl={jiraBaseUrl}
                      className="home-compact-rows__key"
                    />
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
    </>
  );
}
