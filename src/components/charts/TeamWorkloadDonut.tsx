import { useMemo, useState } from "react";
import type { WorkloadRow } from "../../domain/performance";
import {
  buildTeamWorkloadDonutSegments,
  teamWorkloadDonutMetricLabel,
} from "../../domain/workload/buildTeamWorkloadDonutSegments";
import { workloadBadgeVariantFromLabel } from "../../domain/performance/performanceStatusBadges";
import { Badge } from "../Badge/Badge";
import "./team-workload-donut.css";

const SEGMENT_COLORS = [
  "var(--color-accent-primary)",
  "var(--color-status-info)",
  "var(--color-status-warning)",
  "var(--color-status-success)",
  "var(--color-status-danger)",
  "var(--color-text-secondary)",
];

function donutGradient(segments: { weight: number }[]): string {
  const total = segments.reduce((sum, s) => sum + s.weight, 0);
  if (total <= 0) {
    return "conic-gradient(var(--color-border-subtle) 0deg 360deg)";
  }
  let cursor = 0;
  const stops: string[] = [];
  segments.forEach((segment, index) => {
    const slice = (segment.weight / total) * 360;
    const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
    const start = cursor;
    const end = cursor + slice;
    stops.push(`${color} ${start}deg ${end}deg`);
    cursor = end;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function TeamWorkloadDonut({ workload }: { workload: WorkloadRow[] }) {
  const segments = useMemo(() => buildTeamWorkloadDonutSegments(workload), [workload]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.weight, 0);
  const metricLabel = teamWorkloadDonutMetricLabel(workload);

  if (!segments.length) {
    return null;
  }

  const hovered = segments.find((s) => s.personId === hoverId);

  return (
    <section
      className="team-workload-donut"
      aria-label="Team workload distribution"
      data-testid="team-brief-workload-donut"
    >
      <h3 className="team-workload-donut__title">Team workload</h3>
      <p className="team-workload-donut__metric-label">{metricLabel}</p>
      <div className="team-workload-donut__layout">
        <div
          className="team-workload-donut__ring"
          style={{ background: donutGradient(segments) }}
          role="img"
          aria-label={
            total > 0
              ? segments
                  .map((s) => `${s.personName}: ${s.detailLabel}`)
                  .join("; ")
              : "No workload data"
          }
        >
          <div className="team-workload-donut__ring-hole" />
          {hovered ? (
            <div className="team-workload-donut__center" aria-live="polite">
              <span className="team-workload-donut__center-name">{hovered.personName}</span>
              <span className="team-workload-donut__center-value">{hovered.detailLabel}</span>
            </div>
          ) : null}
        </div>
        <ul className="team-workload-donut__legend">
          {segments.map((segment, index) => {
            const pct = total > 0 ? Math.round((segment.weight / total) * 100) : 0;
            return (
              <li
                key={segment.personId}
                className="team-workload-donut__legend-row"
                onMouseEnter={() => setHoverId(segment.personId)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(segment.personId)}
                onBlur={() => setHoverId(null)}
              >
                <span
                  className="team-workload-donut__swatch"
                  style={{ background: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
                  aria-hidden
                />
                <span className="team-workload-donut__legend-name">{segment.personName}</span>
                <span className="team-workload-donut__legend-value">
                  {segment.detailLabel} · {pct}%
                </span>
                <Badge variant={workloadBadgeVariantFromLabel(segment.workloadLabel)}>
                  {segment.workloadLabel}
                </Badge>
              </li>
            );
          })}
        </ul>
      </div>
      <table className="team-workload-donut__sr-table">
        <caption>{metricLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Load</th>
            <th scope="col">Share</th>
            <th scope="col">Workload</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((segment) => {
            const pct = total > 0 ? Math.round((segment.weight / total) * 100) : 0;
            return (
              <tr key={segment.personId}>
                <td>{segment.personName}</td>
                <td>{segment.detailLabel}</td>
                <td>{pct}%</td>
                <td>{segment.workloadLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
