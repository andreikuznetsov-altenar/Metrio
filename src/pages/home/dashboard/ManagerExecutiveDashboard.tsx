import { useMemo } from "react";
import type { ActionItem } from "../../../domain/actions/actionTypes";
import { buildDashboardAttentionOverview } from "../../../domain/home/buildDashboardAttentionOverview";
import { buildManagerDashboardKpis } from "../../../domain/home/buildDashboardKpis";
import type { DashboardSyncStatus } from "../../../domain/home/dashboardSyncStatus";
import type {
  HomePersonalWorkspace,
  HomeProjectSignal,
  HomeTeamWorkspace,
} from "../../../domain/home/homeTypes";
import type { TeamPerformanceSnapshot, TrendCardData } from "../../../domain/performance";
import type { Person } from "../../../domain/people/types";
import { DashboardAttentionOverview } from "./DashboardAttentionOverview";
import { DashboardDeliverySummaryCard } from "./DashboardDeliverySummaryCard";
import { DashboardExecutiveHeader } from "./DashboardExecutiveHeader";
import { DashboardKpiStrip } from "./DashboardKpiStrip";
import { DashboardPerformancePulse } from "./DashboardPerformancePulse";
import { DashboardQueuePanel } from "./DashboardQueuePanel";
import { DashboardTeamCapacityCard } from "./DashboardTeamCapacityCard";
import { DashboardCompactRow } from "../../../components/DashboardCompactRow/DashboardCompactRow";
import { Button } from "../../../components/Button/Button";
import { SortableTableHeader } from "../../../components/Table/SortableTableHeader";
import { useTableSort } from "../../../components/Table/useTableSort";
import { PersonAvatar } from "../../../components/PersonAvatar/PersonAvatar";
import { HomeGoalsSummaryCard } from "../HomeGoalsSummaryCard";
import type { DashboardPerformancePulseProps } from "./DashboardPerformancePulse";
import type { summarizeGoalsForHome } from "../../../domain/goals/goalReview";
import { DashboardSecondaryGrid } from "./DashboardSecondaryGrid";
import { DashboardTeamBriefCard } from "./DashboardTeamBriefCard";

const QUEUE_PREVIEW = 5;

const PROJECT_SIGNAL_COLUMNS = [
  { id: "project", type: "text" as const },
  { id: "signal", type: "text" as const },
  { id: "action", type: "text" as const },
];

function ExecutiveProjectSignalsTable({
  signals,
  onOpenProject,
}: {
  signals: HomeProjectSignal[];
  onOpenProject: (projectKey: string) => void;
}) {
  const getValue = useMemo(
    () => (row: HomeProjectSignal, columnId: string) => {
      switch (columnId) {
        case "project":
          return row.projectKey;
        case "signal":
          return row.label;
        case "action":
          return "Open project";
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(
    signals,
    PROJECT_SIGNAL_COLUMNS,
    getValue,
  );

  return (
    <table className="executive-queue-table">
      <thead>
        <tr>
          <SortableTableHeader
            columnId="project"
            label="Project"
            sort={sort}
            onToggle={toggleSort}
          />
          <SortableTableHeader
            columnId="signal"
            label="Signal"
            sort={sort}
            onToggle={toggleSort}
          />
          <SortableTableHeader
            columnId="action"
            label="Action"
            sort={sort}
            onToggle={toggleSort}
            className="executive-queue-table__cta"
            align="right"
          />
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((signal) => (
          <tr key={signal.projectKey}>
            <td className="executive-queue-table__work">{signal.projectKey}</td>
            <td className="executive-queue-table__context">{signal.label}</td>
            <td className="executive-queue-table__cta">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenProject(signal.projectKey)}
              >
                Open project
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

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
  onOpenProject: (projectKey: string) => void;
  onOpenPerson: (personId: string) => void;
  onOpenJiraAssignment: (issueKey: string) => void;
  onOpenMyWeek: () => void;
  onOpenPerformance: () => void;
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
  onOpenProject,
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
  const kpis = buildManagerDashboardKpis({
    deliveryRiskCount,
    deliverySummary: team.deliverySummary,
    teamSnapshot,
    awayNextWeek: team.awayNextWeek,
  });
  const attention = buildDashboardAttentionOverview({
    deliverySummary: team.deliverySummary,
    workload: teamSnapshot?.workload ?? [],
  });

  const focusPreview = personal.focus.slice(0, QUEUE_PREVIEW);
  const teamPreview = team.actions.slice(0, QUEUE_PREVIEW);
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
          activeJiraCount={activeJiraCount}
          newAssignmentCount={newAssignmentCount}
          lastUpdatedAt={lastUpdatedAt}
          dashboardSyncStatus={dashboardSyncStatus}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </div>

      <DashboardKpiStrip cards={kpis} />
      <DashboardAttentionOverview stats={attention} />
      <DashboardPerformancePulse trends={trends} onPointClick={onOpenTrendPoint} />

      <div className="executive-dashboard__span-6">
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
      <div className="executive-dashboard__span-6">
        <DashboardQueuePanel
          title="Team actions"
          workColumnLabel="Subject"
          items={teamPreview}
          emptyMessage="No high-priority team actions right now."
          onOpen={onOpenAction}
          openLabel={actionOpenLabel}
          testId="dashboard-team-actions"
          footerAction={{
            label:
              team.actions.length > QUEUE_PREVIEW
                ? "View all team actions"
                : "Open team overview",
            onClick: onOpenTeamOverview,
          }}
        />
      </div>

      <div className="executive-dashboard__span-6">
        <DashboardDeliverySummaryCard
          summary={team.deliverySummary}
          onOpenDeliveryRisk={onOpenDeliveryRisk}
        />
      </div>
      <div className="executive-dashboard__span-6">
        <DashboardTeamCapacityCard
          teamSnapshot={teamSnapshot}
          awayNextWeek={team.awayNextWeek}
          availabilityPreview={team.availabilityPreview}
          onOpenTeamOverview={onOpenTeamOverview}
        />
      </div>

      {team.projectSignals.length > 0 ? (
        <section
          className="executive-dashboard__span-12 executive-panel"
          aria-label="Project signals"
          data-testid="dashboard-project-signals"
        >
          <h2 className="executive-panel__title">Project signals</h2>
          <ExecutiveProjectSignalsTable
            signals={team.projectSignals}
            onOpenProject={onOpenProject}
          />
        </section>
      ) : null}

      {personal.newAssignments.length > 0 ? (
        <section
          className="executive-dashboard__span-12 executive-panel"
          aria-label="New assignments"
        >
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
                subjectAction={() => void onOpenJiraAssignment(record.issueKey)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {team.newStarters.length > 0 ? (
        <section
          className="executive-dashboard__span-12 executive-panel"
          aria-label="New starters"
          data-testid="dashboard-new-starters"
        >
          <h2 className="executive-panel__title">New starters</h2>
          {team.newStarters.map((row) => {
            const person = teamPersons.find((p) => p.id === row.personId);
            const [completeSteps, totalSteps] = (row.progressLabel ?? "")
              .split("/")
              .map((part) => Number.parseInt(part, 10));
            const progressRatio =
              Number.isFinite(completeSteps) &&
              Number.isFinite(totalSteps) &&
              totalSteps > 0
                ? completeSteps / totalSteps
                : null;
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
                {progressRatio != null ? (
                  <div
                    className="home-new-starter-card__progress"
                    role="progressbar"
                    aria-valuenow={completeSteps}
                    aria-valuemin={0}
                    aria-valuemax={totalSteps}
                  >
                    <span
                      className="home-new-starter-card__progress-fill"
                      style={{ width: `${Math.round(progressRatio * 100)}%` }}
                    />
                  </div>
                ) : null}
                <div className="home-new-starter-card__actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onOpenPerson(row.personId)}
                  >
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
              {personal.knowledge.length > 1
                ? ` (+${personal.knowledge.length - 1} more)`
                : ""}
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
    </>
  );
}
