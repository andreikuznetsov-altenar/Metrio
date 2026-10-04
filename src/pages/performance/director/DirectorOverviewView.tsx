import { useMemo } from "react";
import type { OrganizationOverviewModel } from "../../../domain/organization/organizationTypes";
import type { OrganizationSignal } from "../../../domain/organization/organizationTypes";
import { Button } from "../../../components/Button/Button";
import { Badge } from "../../../components/Badge/Badge";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../../components/Table/SortableTableHeader";
import { useTableSort } from "../../../components/Table/useTableSort";

const TEAMS_ATTENTION_COLUMNS = [
  { id: "team", type: "text" as const },
  { id: "attention", type: "number" as const },
  { id: "active", type: "number" as const },
];

export interface DirectorOverviewViewProps {
  model: OrganizationOverviewModel;
  onOpenSignal: (signal: OrganizationSignal) => void;
  onOpenTeams: () => void;
}

export function DirectorOverviewView({
  model,
  onOpenSignal,
  onOpenTeams,
}: DirectorOverviewViewProps) {
  const topSignals = model.signals.slice(0, 5);

  const teamsAttention = model.teamsNeedingAttention.slice(0, 6);

  const getValue = useMemo(
    () => (row: (typeof teamsAttention)[number], columnId: string) => {
      switch (columnId) {
        case "team":
          return row.teamName;
        case "attention":
          return row.attentionCount;
        case "active":
          return row.activeWork;
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(
    teamsAttention,
    TEAMS_ATTENTION_COLUMNS,
    getValue,
  );

  return (
    <div data-testid="director-overview">
      <p className="performance-employee-context">{model.scopeLabel}</p>

      <h3 className="performance-section__title">Organization summary</h3>
      <div className="performance-metrics">
        {model.summary.map((metric) => (
          <div key={metric.label} className="performance-metric-card">
            <div className="performance-metric-card__label">{metric.label}</div>
            <div className="performance-metric-card__value">{metric.value}</div>
          </div>
        ))}
      </div>

      <h3 className="performance-section__title">Teams needing attention</h3>
      {model.teamsNeedingAttention.length === 0 ? (
        <p className="performance-inline-empty">
          No high-priority organization signals in this period.
        </p>
      ) : (
        <MetrioTableWrap>
          <table className={METRIO_TABLE_CLASS}>
            <thead>
              <tr>
                <SortableTableHeader columnId="team" label="Team" sort={sort} onToggle={toggleSort} />
                <SortableTableHeader
                  columnId="attention"
                  label="Attention"
                  sort={sort}
                  onToggle={toggleSort}
                  className="performance-table__num"
                  align="right"
                />
                <SortableTableHeader
                  columnId="active"
                  label="Active work"
                  sort={sort}
                  onToggle={toggleSort}
                  className="performance-table__num"
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((team) => (
                <tr key={team.teamId}>
                  <td>{team.teamName}</td>
                  <td className="performance-table__num">{team.attentionCount}</td>
                  <td className="performance-table__num">{team.activeWork}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </MetrioTableWrap>
      )}

      {model.teamCapacity.some((row) => row.awayNextWeek > 0) ? (
        <>
          <h3 className="performance-section__title">Upcoming team availability</h3>
          <ul className="performance-director-capacity" data-testid="director-team-capacity">
            {model.teamCapacity
              .filter((row) => row.awayNextWeek > 0)
              .map((row) => (
                <li key={row.teamId}>
                  <strong>{row.teamName}</strong>
                  <span>{row.label}</span>
                </li>
              ))}
          </ul>
        </>
      ) : null}

      <h3 className="performance-section__title">Team trends</h3>
      <ul className="performance-director-trends">
        {model.teamTrends.map((trend) => (
          <li key={trend.teamId}>
            <strong>{trend.teamName}</strong>
            <span>{trend.label}</span>
          </li>
        ))}
      </ul>

      {model.newStarterSummary.total > 0 ? (
        <>
          <h3 className="performance-section__title">New starters</h3>
          <p className="performance-inline-empty">
            {model.newStarterSummary.total} new starters in authorized scope
            {model.newStarterSummary.byTeam.length
              ? ` · ${model.newStarterSummary.byTeam
                  .map((row) => `${row.count} in ${row.teamName}`)
                  .join(", ")}`
              : ""}
          </p>
        </>
      ) : null}

      {model.feedbackSummary.pendingRecipients > 0 ||
      model.feedbackSummary.deliveryFailures > 0 ? (
        <>
          <h3 className="performance-section__title">Feedback</h3>
          <p className="performance-inline-empty">
            {model.feedbackSummary.pendingRecipients} pending responses
            {model.feedbackSummary.deliveryFailures
              ? ` · ${model.feedbackSummary.deliveryFailures} delivery failures`
              : ""}
          </p>
        </>
      ) : null}

      <h3 className="performance-section__title">Signals</h3>
      {topSignals.length === 0 ? (
        <p className="performance-inline-empty">
          No high-priority organization signals in this period.
        </p>
      ) : (
        <ul className="performance-director-signals">
          {topSignals.map((signal) => (
            <li key={signal.id}>
              <Badge variant={signal.severity === "danger" ? "danger" : "warning"}>
                {signal.severity}
              </Badge>
              <div>
                <div>{signal.title}</div>
                <div className="performance-inline-empty">{signal.description}</div>
              </div>
              <Button variant="ghost" onClick={() => onOpenSignal(signal)}>
                Open
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button variant="secondary" onClick={onOpenTeams}>
        View all teams
      </Button>
    </div>
  );
}
