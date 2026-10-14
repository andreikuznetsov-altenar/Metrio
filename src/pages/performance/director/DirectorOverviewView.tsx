import { useMemo } from "react";
import type { OrganizationOverviewModel } from "../../../domain/organization/organizationTypes";
import type { OrganizationSignal } from "../../../domain/organization/organizationTypes";
import { Button } from "../../../components/Button/Button";
import { Badge } from "../../../components/Badge/Badge";
import { Card } from "../../../components/Card/Card";
import { ScopeStrip } from "../../../components/ScopeStrip/ScopeStrip";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../../components/Table/SortableTableHeader";
import { useTableSort } from "../../../components/Table/useTableSort";
import { CapacityBadgeMix } from "./LeadershipBranchesPerformanceView";

const TEAMS_ATTENTION_COLUMNS = [
  { id: "team", type: "text" as const },
  { id: "attention", type: "number" as const },
  { id: "active", type: "number" as const },
  { id: "capacity", type: "text" as const },
  { id: "availability", type: "text" as const },
];

function parseCapacitySummaryLabel(label?: string): Array<{ label: string; value: number }> {
  if (!label) return [];
  return label
    .split("·")
    .map((part) => part.trim().match(/^(\d+)\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ value: Number(match[1]), label: match[2] }));
}

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
  const capacityByTeamId = useMemo(
    () => new Map(model.teamCapacity.map((row) => [row.teamId, row])),
    [model.teamCapacity],
  );

  const getValue = useMemo(
    () => (row: (typeof teamsAttention)[number], columnId: string) => {
      switch (columnId) {
        case "team":
          return row.teamName;
        case "attention":
          return row.attentionCount;
        case "active":
          return row.activeWork;
        case "capacity":
          return row.capacitySummaryLabel ?? "";
        case "availability":
          return capacityByTeamId.get(row.teamId)?.label ?? "";
        default:
          return "";
      }
    },
    [capacityByTeamId],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(
    teamsAttention,
    TEAMS_ATTENTION_COLUMNS,
    getValue,
  );

  return (
    <div className="performance-section-stack" data-testid="director-overview">
      <ScopeStrip
        className="performance-section"
        eyebrow="Performance scope"
        title={model.scopeLabel}
        data-testid="director-scope-header"
        action={
          <Button variant="secondary" onClick={onOpenTeams}>
            View all teams
          </Button>
        }
      />

      <section className="performance-section" aria-label="Organization summary">
        <h3 className="performance-section__title">Organization summary</h3>
        <div className="performance-metrics" data-testid="director-kpi-row">
        {model.summary.map((metric) => (
          <Card key={metric.label} className="performance-metric-card">
            <div className="performance-metric-card__label">{metric.label}</div>
            <div className="performance-metric-card__value">{metric.value}</div>
          </Card>
        ))}
        </div>
      </section>

      <section className="performance-section" aria-label="Teams needing attention">
      <h3 className="performance-section__title">Teams needing attention</h3>
      {model.teamsNeedingAttention.length === 0 ? (
        <p className="performance-inline-empty performance-inline-empty--surface">
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

                />
                <SortableTableHeader
                  columnId="active"
                  label="Active work"
                  sort={sort}
                  onToggle={toggleSort}
                  className="performance-table__num"

                />
                <SortableTableHeader
                  columnId="capacity"
                  label="Capacity"
                  sort={sort}
                  onToggle={toggleSort}
                />
                <SortableTableHeader
                  columnId="availability"
                  label="Availability"
                  sort={sort}
                  onToggle={toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((team) => (
                <tr key={team.teamId}>
                  <td>{team.teamName}</td>
                  <td className="performance-table__num">{team.attentionCount}</td>
                  <td className="performance-table__num">{team.activeWork}</td>
                  <td>
                    <CapacityBadgeMix
                      parts={parseCapacitySummaryLabel(team.capacitySummaryLabel)}
                      ariaLabel={team.capacitySummaryLabel ?? "No measured capacity"}
                    />
                  </td>
                  <td>{capacityByTeamId.get(team.teamId)?.label ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </MetrioTableWrap>
      )}
      </section>

      <div className="performance-director-compact-grid" data-testid="director-compact-grid">
        {model.teamCapacity.some((row) => row.awayNextWeek > 0) ? (
          <section
            className="performance-section performance-section--compact-surface"
            aria-label="Upcoming team availability"
            data-testid="director-upcoming-availability"
          >
            <h3 className="performance-section__title">Upcoming team availability</h3>
            <ul
              className="executive-resources-card__list"
              data-testid="director-team-capacity"
            >
              {model.teamCapacity
                .filter((row) => row.awayNextWeek > 0)
                .map((row) => (
                  <li key={row.teamId} className="executive-resources-card__row">
                    <strong>{row.teamName}</strong>
                    <span>{row.label}</span>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        <section
          className="performance-section performance-section--compact-surface"
          aria-label="Team trends"
        >
          <h3 className="performance-section__title">Team trends</h3>
          <ul className="executive-resources-card__list">
            {model.teamTrends.map((trend) => (
              <li key={trend.teamId} className="executive-resources-card__row">
                <strong>{trend.teamName}</strong>
                <span>{trend.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {model.newStarterSummary.total > 0 ? (
          <section
            className="performance-section performance-section--compact-surface"
            aria-label="New starters"
          >
            <h3 className="performance-section__title">New starters</h3>
            <p className="performance-inline-empty">
              {model.newStarterSummary.total} new starters in authorized scope
              {model.newStarterSummary.byTeam.length
                ? ` · ${model.newStarterSummary.byTeam
                    .map((row) => `${row.count} in ${row.teamName}`)
                    .join(", ")}`
                : ""}
            </p>
          </section>
        ) : null}

        {model.feedbackSummary.pendingRecipients > 0 ||
        model.feedbackSummary.deliveryFailures > 0 ? (
          <section
            className="performance-section performance-section--compact-surface"
            aria-label="Feedback"
          >
            <h3 className="performance-section__title">Feedback</h3>
            <p className="performance-inline-empty">
              {model.feedbackSummary.pendingRecipients} pending responses
              {model.feedbackSummary.deliveryFailures
                ? ` · ${model.feedbackSummary.deliveryFailures} delivery failures`
                : ""}
            </p>
          </section>
        ) : null}
      </div>

      <section className="performance-section" aria-label="Signals">
      <h3 className="performance-section__title">Signals</h3>
      {topSignals.length === 0 ? (
        <p className="performance-inline-empty performance-inline-empty--surface">
          No high-priority organization signals in this period.
        </p>
      ) : (
        <ul className="performance-scope-strip-list">
          {topSignals.map((signal) => (
            <li key={signal.id}>
              <ScopeStrip
                ariaLabel={signal.title}
                leading={
                  <Badge variant={signal.severity === "danger" ? "danger" : "warning"}>
                    {signal.severity}
                  </Badge>
                }
                title={signal.title}
                description={signal.description}
                action={
                  <Button variant="secondary" size="small" onClick={() => onOpenSignal(signal)}>
                    Open
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
      </section>
    </div>
  );
}
