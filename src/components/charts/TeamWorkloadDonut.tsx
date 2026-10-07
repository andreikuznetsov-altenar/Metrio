import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { Person } from "../../domain/people/types";
import type { WorkloadRow } from "../../domain/performance";
import type { TeamWorkloadViewContext } from "../../domain/workload/hierarchicalWorkload";
import { workloadBadgeVariantFromLabel } from "../../domain/performance/performanceStatusBadges";
import {
  buildTeamWorkloadDonutSegments,
  selectDefaultTeamWorkloadDonutPersonId,
  teamWorkloadDonutColorForPerson,
  teamWorkloadDonutMetricLabel,
  workloadDonutSupportingMetric,
} from "../../domain/workload/buildTeamWorkloadDonutSegments";
import { Badge } from "../Badge/Badge";
import "./team-workload-donut.css";

type ChartRow = {
  personId: string;
  personName: string;
  weight: number;
  workloadLabel: string;
  detailLabel: string;
  sharePct: number;
  supportingMetric: string;
  availability: string;
  fill: string;
};

export function TeamWorkloadDonut({
  workload,
  context = { mode: "own_team" },
  personsById,
}: {
  workload: WorkloadRow[];
  context?: TeamWorkloadViewContext;
  personsById?: Map<string, Person>;
}) {
  const segments = useMemo(
    () => buildTeamWorkloadDonutSegments(workload, { context, personsById }),
    [workload, context, personsById],
  );
  const workloadById = useMemo(
    () => new Map(workload.map((row) => [row.personId, row])),
    [workload],
  );
  const defaultPersonId = useMemo(
    () => selectDefaultTeamWorkloadDonutPersonId(workload),
    [workload],
  );
  const [selectedId, setSelectedId] = useState<string | null>(defaultPersonId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(defaultPersonId);
  }, [defaultPersonId]);

  const total = segments.reduce((sum, s) => sum + s.weight, 0);
  const metricLabel = teamWorkloadDonutMetricLabel(workload);

  const chartData = useMemo<ChartRow[]>(() => {
    const usedColorIndices = new Set<number>();
    return segments.map((segment) => {
      const source = workloadById.get(segment.personId);
      return {
        ...segment,
        sharePct: total > 0 ? Math.round((segment.weight / total) * 100) : 0,
        supportingMetric: source ? workloadDonutSupportingMetric(source) : "—",
        availability: source?.availability ?? "—",
        fill: teamWorkloadDonutColorForPerson(segment.personId, usedColorIndices),
      };
    });
  }, [segments, total, workloadById]);

  if (!chartData.length) {
    return null;
  }

  const selected = chartData.find((row) => row.personId === selectedId) ?? chartData[0];

  return (
    <section
      className="team-workload-donut"
      aria-label="Team workload distribution"
      data-testid="team-brief-workload-donut"
    >
      <h3 className="team-workload-donut__title">Team workload</h3>
      <p className="team-workload-donut__metric-label">{metricLabel}</p>

      <div className="team-workload-donut__layout">
        <div className="team-workload-donut__chart-wrap">
          <PieChart width={220} height={220} className="team-workload-donut__chart">
            <Pie
              data={chartData}
              dataKey="weight"
              nameKey="personName"
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={102}
              paddingAngle={1}
              stroke="none"
              onClick={(_data, index) => {
                const row = chartData[index];
                if (row) setSelectedId(row.personId);
              }}
              onMouseEnter={(_data, index) => {
                setHoveredId(chartData[index]?.personId ?? null);
              }}
              onMouseLeave={() => setHoveredId(null)}
            >
              {chartData.map((row) => {
                const isSelected = row.personId === selectedId;
                const isHovered = row.personId === hoveredId;
                let opacity = 1;
                if (selectedId && !isSelected) opacity = 0.5;
                if (isHovered && !isSelected) opacity = 0.72;
                return (
                  <Cell key={row.personId} fill={row.fill} opacity={opacity} stroke="none" />
                );
              })}
            </Pie>
          </PieChart>
          <div className="team-workload-donut__center" aria-hidden="true">
            <span className="team-workload-donut__center-label">Workload</span>
          </div>
        </div>

        <div
          className="team-workload-donut__detail"
          data-testid="team-brief-workload-detail"
          aria-live="polite"
        >
          <p className="team-workload-donut__detail-name">{selected.personName}</p>
          <dl className="team-workload-donut__detail-stack">
            <div>
              <dt>Load</dt>
              <dd>
                {selected.detailLabel} · {selected.sharePct}% of team
              </dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{selected.supportingMetric}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge variant={workloadBadgeVariantFromLabel(selected.workloadLabel)}>
                  {selected.workloadLabel}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>{selected.availability}</dd>
            </div>
          </dl>
        </div>
      </div>

      <ul className="team-workload-donut__a11y-list" aria-label="Select team member workload">
        {chartData.map((row) => (
          <li key={row.personId}>
            <button
              type="button"
              className="team-workload-donut__a11y-option"
              aria-pressed={selectedId === row.personId}
              onClick={() => setSelectedId(row.personId)}
            >
              {row.personName}: {row.detailLabel}, {row.sharePct}% of team, {row.workloadLabel}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
