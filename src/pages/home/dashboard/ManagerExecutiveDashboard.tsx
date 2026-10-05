import type { ActionItem } from "../../../domain/actions/actionTypes";
import {
  buildManagerExecutiveModel,
  type ManagerExecutiveModel,
} from "../../../domain/home/executiveDashboardModel";
import type { DashboardSyncStatus } from "../../../domain/home/dashboardSyncStatus";
import type {
  HomePersonalWorkspace,
  HomeTeamWorkspace,
} from "../../../domain/home/homeTypes";
import type { TeamPerformanceSnapshot, TrendCardData } from "../../../domain/performance";
import type { Person } from "../../../domain/people/types";
import { DashboardActionTabs } from "./DashboardActionTabs";
import { DashboardAttentionNow } from "./DashboardAttentionNow";
import { DashboardDeliveryVisual } from "./DashboardDeliveryVisual";
import { DashboardExecutiveHeader } from "./DashboardExecutiveHeader";
import { DashboardKpiStrip } from "./DashboardKpiStrip";
import { DashboardPrimaryTrend } from "./DashboardPrimaryTrend";
import { DashboardScopeHealthSummary } from "./DashboardScopeHealthSummary";
import { DashboardTeamCapacityVisual } from "./DashboardTeamCapacityVisual";
import { DashboardCompactRow } from "../../../components/DashboardCompactRow/DashboardCompactRow";
import { Button } from "../../../components/Button/Button";
import { PersonAvatar } from "../../../components/PersonAvatar/PersonAvatar";
import { HomeGoalsSummaryCard } from "../HomeGoalsSummaryCard";
import type { DashboardPerformancePulseProps } from "./DashboardPerformancePulse";
import type { summarizeGoalsForHome } from "../../../domain/goals/goalReview";
import { DashboardSecondaryGrid } from "./DashboardSecondaryGrid";
import { DashboardTeamBriefCard } from "./DashboardTeamBriefCard";

const QUEUE_PREVIEW = 5;
type GoalsHomeSummary = ReturnType<typeof summarizeGoalsForHome>;

export interface ManagerExecutiveDashboardProps {
  greeting: string;
  activeJiraCount: number;
  newAssignmentCount: number;
  lastUpdatedAt: string | null;
  dashboardSyncStatus: DashboardSyncStatus | null;
  refreshing: boolean;
  onRefresh: () => void;
  personal: HomePersonalWorkspace;
  team: HomeTeamWorkspace;
  teamSnapshot: TeamPerformanceSnapshot | null;
  deliveryRiskCount: number;
  trends: TrendCardData[];
  onOpenAction: (item: ActionItem) => void;
  actionOpenLabel: (item: ActionItem) => string;
  onOpenTrendPoint?: DashboardPerformancePulseProps["onPointClick"];
  onOpenDeliveryRisk: () => void;
  onOpenTeamOverview: () => void;
  onOpenPerson: (personId: string) => void;
  onOpenJiraAssignment: (issueKey: string) => void;
  onOpenMyWeek: () => void;
  onOpenFeedback: () => void;
  teamPersons: Person[];
  goalsSummary: GoalsHomeSummary | null;
  goalsFeatureOn: boolean;
  goalsProminent: boolean;
  canOpenPersonBrief: (personId: string) => boolean;
  teamBrief?: { headline: string; detail: string; onOpen: () => void } | null;
}

export function ManagerExecutiveDashboard({
  greeting,
  activeJiraCount,
  newAssignmentCount,
  lastUpdatedAt,
  dashboardSyncStatus,
  refreshing,
  onRefresh,
  personal,
  team,
  teamSnapshot,
  deliveryRiskCount,
  trends,
  onOpenAction,
  actionOpenLabel,
  onOpenTrendPoint,
  onOpenDeliveryRisk,
  onOpenTeamOverview,
  onOpenPerson,
  onOpenJiraAssignment,
  onOpenMyWeek,
  onOpenFeedback,
  teamPersons,
  goalsSummary,
  goalsFeatureOn,
  goalsProminent,
  canOpenPersonBrief,
  teamBrief = null,
}: ManagerExecutiveDashboardProps) {
  const model: ManagerExecutiveModel = buildManagerExecutiveModel({
    performanceSnapshot: personal.performanceSnapshot,
    focus: personal.focus,
    teamActions: team.actions,
    teamSnapshot,
    deliveryRiskCount,
    deliverySummary: team.deliverySummary,
    trends,
  });

  const feedbackProminent =
    team.feedback &&
    (/failure|survey in progress|pending/i.test(team.feedback.headline) ||
      Boolean(team.feedback.detail?.match(/failure|pending/i)));

  const goalsSecondary =
    goalsFeatureOn && goalsSummary && !goalsProminent ? goalsSummary : null;
  const showSecondaryGrid = Boolean(goalsSecondary || teamBrief);

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
      <DashboardPrimaryTrend
        trends={model.trends}
        spanClass={model.trendSpanClass}
        onPointClick={onOpenTrendPoint}
      />
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
          team: {
            label:
              team.actions.length > QUEUE_PREVIEW
                ? "View all team actions"
                : "Open team overview",
            onClick: onOpenTeamOverview,
          },
        }}
      />
      <DashboardTeamCapacityVisual workload={model.teamWorkload} />
      <DashboardDeliveryVisual summary={model.deliverySummary} />
      {team.newStarters.length > 0 ? (
        <section
          className="executive-dashboard__span-12 executive-panel"
          aria-label="New starters"
          data-testid="dashboard-new-starters"
        >
          <h2 className="executive-panel__title">New starters</h2>
          {team.newStarters.map((row) => {
            const person = teamPersons.find((p) => p.id === row.personId);
            return (
              <article
                key={row.personId}
                className="home-new-starter-card"
                data-testid="dashboard-new-starter-row"
              >
                <div className="home-new-starter-card__head">
                  {person ? <PersonAvatar person={person} size="sm" /> : null}
                  <div className="home-new-starter-card__identity">
                    <p className="home-new-starter-card__name">{row.personName}</p>
                    <p className="home-new-starter-card__meta">{row.dayLabel}</p>
                  </div>
                </div>
                <div className="home-new-starter-card__actions">
                  <Button type="button" variant="secondary" onClick={() => onOpenPerson(row.personId)}>
                    View person
                  </Button>
                  {canOpenPersonBrief(row.personId) ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("metrio-open-person-brief", {
                            detail: { personId: row.personId },
                          }),
                        );
                      }}
                    >
                      Prepare for 1:1
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
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
          <HomeGoalsSummaryCard teamView summary={goalsSummary} prominent />
        </div>
      ) : null}
      {feedbackProminent && team.feedback ? (
        <section className="executive-dashboard__span-12 executive-panel" aria-label="Feedback">
          <h2 className="executive-panel__title">Feedback</h2>
          <p className="home-card__lead">{team.feedback.headline}</p>
          {team.feedback.detail ? (
            <p className="home-card__meta">{team.feedback.detail}</p>
          ) : null}
          <div className="home-card__actions">
            <Button type="button" variant="secondary" onClick={onOpenFeedback}>
              Open Feedback
            </Button>
          </div>
        </section>
      ) : null}
      {showSecondaryGrid ? (
        <div className="executive-dashboard__span-12">
          <DashboardSecondaryGrid>
            {goalsSecondary ? (
              <HomeGoalsSummaryCard
                teamView
                summary={goalsSecondary}
                moduleSurface="secondary"
              />
            ) : null}
            {teamBrief ? (
              <DashboardTeamBriefCard
                headline={teamBrief.headline}
                detail={teamBrief.detail}
                onOpen={teamBrief.onOpen}
              />
            ) : null}
          </DashboardSecondaryGrid>
        </div>
      ) : null}
      {personal.knowledge.length > 0 ||
      (!feedbackProminent && team.feedback) ? (
        <div className="executive-dashboard__span-12 executive-lower-section">
          {personal.knowledge.length > 0 ? (
            <p className="executive-secondary-line">
              Knowledge: {personal.knowledge[0]?.title}
            </p>
          ) : null}
          {!feedbackProminent && team.feedback ? (
            <p className="executive-secondary-line">
              {team.feedback.headline}
              <Button type="button" variant="secondary" onClick={onOpenFeedback}>
                Open Feedback
              </Button>
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="executive-dashboard__span-12 home-card__actions">
        <Button type="button" variant="secondary" onClick={onOpenDeliveryRisk}>
          Open delivery risk
        </Button>
      </div>
    </>
  );
}
