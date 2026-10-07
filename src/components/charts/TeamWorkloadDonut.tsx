import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import type { WorkloadRow } from "../../domain/performance";
import { workloadBadgeVariantFromLabel } from "../../domain/performance/performanceStatusBadges";
import {
  buildTeamWorkloadDonutSegments,
  teamWorkloadDonutMetricLabel,
  workloadDonutSupportingMetric,
} from "../../domain/workload/buildTeamWorkloadDonutSegments";
import { Badge } from "../Badge/Badge";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../Table/MetrioTable";
import "./team-workload-donut.css";

const SEGMENT_COLORS = [
  "var(--color-accent-primary)",
  "var(--color-status-info)",
  "var(--color-status-warning)",
  "var(--color-status-success)",
  "var(--color-status-danger)",
  "var(--color-text-secondary)",
];

type ChartRow = {
  personId: string;
  personName: string;
  weight: number;
  workloadLabel: string;
  detailLabel: string;
  sharePct: number;
  supportingMetric: string;
  fill: string;
};

function WorkloadTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="team-workload-donut__tooltip" role="status">
      <strong>{row.personName}</strong>
      <span>{row.detailLabel}</span>
      <span>{row.sharePct}% of team</span>
    </div>
  );
}

export function TeamWorkloadDonut({ workload }: { workload: WorkloadRow[] }) {
  const segments = useMemo(() => buildTeamWorkloadDonutSegments(workload), [workload]);
  const workloadById = useMemo(
    () => new Map(workload.map((row) => [row.personId, row])),
    [workload],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.weight, 0);
  const metricLabel = teamWorkloadDonutMetricLabel(workload);

  const chartData = useMemo<ChartRow[]>(
    () =>
      segments.map((segment, index) => {
        const source = workloadById.get(segment.personId);
        return {
          ...segment,
          sharePct: total > 0 ? Math.round((segment.weight / total) * 100) : 0,
          supportingMetric: source ? workloadDonutSupportingMetric(source) : "—",
          fill: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
        };
      }),
    [segments, total, workloadById],
  );

  if (!chartData.length) {
    return null;
  }

  const active = chartData.find((row) => row.personId === activeId);

  return (
    <section
      className="team-workload-donut"
      aria-label="Team workload distribution"
      data-testid="team-brief-workload-donut"
    >
      <h3 className="team-workload-donut__title">Team workload</h3>
      <p className="team-workload-donut__metric-label">{metricLabel}</p>

      <div className="team-workload-donut__chart-wrap">
        <PieChart width={280} height={240} className="team-workload-donut__chart">
          <Pie
            data={chartData}
            dataKey="weight"
            nameKey="personName"
            cx="50%"
            cy="50%"
            innerRadius={74}
            outerRadius={112}
            paddingAngle={1}
            stroke="var(--color-surface-elevated)"
            strokeWidth={2}
            onMouseEnter={(_data, index) => {
              setActiveId(chartData[index]?.personId ?? null);
            }}
            onMouseLeave={() => setActiveId(null)}
          >
            {chartData.map((row) => (
              <Cell
                key={row.personId}
                fill={row.fill}
                opacity={activeId && activeId !== row.personId ? 0.42 : 1}
              />
            ))}
          </Pie>
          <Tooltip content={<WorkloadTooltip />} />
        </PieChart>
        {active ? (
          <div className="team-workload-donut__center" aria-live="polite">
            <span className="team-workload-donut__center-name">{active.personName}</span>
            <span className="team-workload-donut__center-value">{active.detailLabel}</span>
            <span className="team-workload-donut__center-share">{active.sharePct}%</span>
          </div>
        ) : null}
      </div>

      <MetrioTableWrap className="team-workload-donut__table-wrap">
        <table
          className={`${METRIO_TABLE_CLASS} team-workload-donut__table`}
          data-testid="team-brief-workload-table"
        >
          <colgroup>
            <col className="col-person" />
            <col className="col-load" />
            <col className="col-supporting" />
            <col className="col-status" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Load / share</th>
              <th scope="col">Supporting metric</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr
                key={row.personId}
                className={
                  activeId === row.personId ? "team-workload-donut__row--active" : undefined
                }
                onMouseEnter={() => setActiveId(row.personId)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(row.personId)}
                onBlur={() => setActiveId(null)}
                tabIndex={0}
              >
                <td>
                  <span className="team-workload-donut__person">
                    <span
                      className="team-workload-donut__swatch"
                      style={{ background: row.fill }}
                      aria-hidden
                    />
                    {row.personName}
                  </span>
                </td>
                <td className="team-workload-donut__load-cell">
                  {row.detailLabel} · {row.sharePct}%
                </td>
                <td className="team-workload-donut__supporting-cell">{row.supportingMetric}</td>
                <td>
                  <Badge variant={workloadBadgeVariantFromLabel(row.workloadLabel)}>
                    {row.workloadLabel}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </MetrioTableWrap>
    </section>
  );
}
