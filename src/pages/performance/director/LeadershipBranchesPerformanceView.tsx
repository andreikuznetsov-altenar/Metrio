import { Fragment, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LeadershipBranchMemberRow } from "../../../domain/organization/leadershipBranchMemberRows";
import type { LeadershipBranchPerformanceRow } from "../../../domain/organization/leadershipBranchPerformanceRows";
import { Button } from "../../../components/Button/Button";
import { Badge } from "../../../components/Badge/Badge";
import { PersonIdentity } from "../../../components/PersonIdentity/PersonIdentity";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../../components/Table/SortableTableHeader";
import { useTableSort } from "../../../components/Table/useTableSort";

const COLUMNS = [
  { id: "leader", type: "text" as const },
  { id: "scope", type: "number" as const },
  { id: "performance", type: "text" as const },
  { id: "attention", type: "text" as const },
  { id: "delivery", type: "number" as const },
  { id: "capacity", type: "text" as const },
  { id: "availability", type: "text" as const },
];

export interface LeadershipBranchesPerformanceViewProps {
  rows: LeadershipBranchPerformanceRow[];
  selectedLeaderId?: string;
  onSelectLeader: (leaderId: string) => void;
  onBack: () => void;
  surfaceTestId?: string;
  /** Team members per branch leader; enables the chevron expand/collapse rows. */
  membersByLeaderId?: Record<string, LeadershipBranchMemberRow[]>;
}

export function CapacityBadgeMix({
  parts,
  measuredLabel,
  ariaLabel,
}: {
  parts: Array<{ label: string; value: number }>;
  measuredLabel?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="performance-capacity-mix" aria-label={ariaLabel}>
      {parts.length ? (
        parts.map((part) => (
          <Badge key={part.label} variant="neutral">
            {part.label}: {part.value}
          </Badge>
        ))
      ) : (
        <span>—</span>
      )}
      {measuredLabel ? (
        <span className="performance-capacity-mix__measured">
          {measuredLabel}
        </span>
      ) : null}
    </div>
  );
}

export function LeadershipBranchesPerformanceView({
  rows,
  selectedLeaderId,
  onSelectLeader,
  onBack,
  surfaceTestId = "leadership-branches-performance",
  membersByLeaderId,
}: LeadershipBranchesPerformanceViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleExpanded = (leaderId: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(leaderId)) next.delete(leaderId);
      else next.add(leaderId);
      return next;
    });
  const getValue = useMemo(
    () => (row: LeadershipBranchPerformanceRow, columnId: string) => {
      switch (columnId) {
        case "leader":
          return row.leaderName;
        case "scope":
          return row.peopleCount;
        case "performance":
          return row.performanceLabel;
        case "attention":
          return row.attentionLabel;
        case "delivery":
          return row.deliveryRiskCount;
        case "capacity":
          return row.capacityLabel;
        case "availability":
          return row.availabilityLabel;
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(rows, COLUMNS, getValue);
  const selected = rows.find((row) => row.leaderId === selectedLeaderId);

  if (selected) {
    return (
      <div data-testid="leadership-branch-detail">
        <Button variant="ghost" onClick={onBack}>
          ← All branches
        </Button>
        <h3 className="performance-section__title">{selected.leaderName}</h3>
        {selected.leaderTitle ? (
          <p className="performance-inline-empty">{selected.leaderTitle}</p>
        ) : null}
        <dl className="performance-director-team-meta">
          <div>
            <dt>Scope</dt>
            <dd>{selected.peopleCount} people</dd>
          </div>
          <div>
            <dt>Performance</dt>
            <dd>{selected.performanceLabel}</dd>
          </div>
          <div>
            <dt>Attention</dt>
            <dd>{selected.attentionLabel}</dd>
          </div>
          <div>
            <dt>Delivery risk</dt>
            <dd>{selected.deliveryRiskCount}</dd>
          </div>
          <div>
            <dt>Capacity</dt>
            <dd>{selected.capacityLabel}</dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>{selected.availabilityLabel}</dd>
          </div>
        </dl>
        <p className="performance-inline-empty">
          Open Delivery Risk or People for this branch from Signals or drill-down actions.
        </p>
      </div>
    );
  }

  return (
    <div data-testid={surfaceTestId}>
      <h3 className="performance-section__title">Leadership branches</h3>
      <MetrioTableWrap>
        <table className={METRIO_TABLE_CLASS}>
          <thead>
            <tr>
              <SortableTableHeader
                columnId="leader"
                label="Leader"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="scope"
                label="Scope"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="performance"
                label="Performance"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="attention"
                label="Attention"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="delivery"
                label="Delivery risk"
                sort={sort}
                onToggle={toggleSort}
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
              {membersByLeaderId ? (
                <th aria-label="Expand team" className="performance-branch-chevron-col" />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const members = membersByLeaderId?.[row.leaderId] ?? [];
              const isOpen = expanded.has(row.leaderId);
              return (
                <Fragment key={row.leaderId}>
                  <tr className={isOpen ? "performance-branch-row performance-branch-row--open" : "performance-branch-row"}>
                    <td>
                      <button
                        type="button"
                        className="performance-table__person-button performance-table__person-button--with-avatar performance-leader-cell"
                        onClick={() => onSelectLeader(row.leaderId)}
                      >
                        <PersonIdentity
                          personId={row.leaderId}
                          displayName={row.leaderName}
                          role={row.leaderTitle}
                          avatarSize="sm"
                        />
                      </button>
                    </td>
                    <td>{row.peopleCount} people</td>
                    <td>{row.performanceLabel}</td>
                    <td>{row.attentionLabel}</td>
                    <td>{row.deliveryRiskCount}</td>
                    <td>
                      <CapacityBadgeMix
                        parts={row.capacityParts}
                        measuredLabel={row.capacityMeasuredLabel}
                        ariaLabel={row.capacityLabel}
                      />
                    </td>
                    <td>{row.availabilityLabel}</td>
                    {membersByLeaderId ? (
                      <td className="performance-branch-chevron-col">
                        {members.length > 0 ? (
                          <button
                            type="button"
                            className="performance-branch-chevron"
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? "Collapse" : "Expand"} ${row.leaderName}'s team`}
                            onClick={() => toggleExpanded(row.leaderId)}
                          >
                            <ChevronDown
                              size={18}
                              strokeWidth={1.8}
                              className={isOpen ? "performance-branch-chevron__icon is-open" : "performance-branch-chevron__icon"}
                            />
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                  {isOpen
                    ? members.map((member) => (
                        <tr
                          key={`${row.leaderId}-${member.personId}`}
                          className="performance-branch-member-row"
                          data-testid="leadership-branch-member-row"
                        >
                          <td className="performance-branch-member-row__person">
                            <PersonIdentity
                              personId={member.personId}
                              displayName={member.displayName}
                              role={member.jobTitle}
                              avatarSize="sm"
                            />
                          </td>
                          <td>Team member</td>
                          <td>{member.performanceLabel}</td>
                          <td>{member.attentionLabel}</td>
                          <td>{member.deliveryRiskCount}</td>
                          <td>
                            <CapacityBadgeMix
                              parts={member.capacityParts}
                              ariaLabel="Capacity"
                            />
                          </td>
                          <td>{member.availabilityLabel}</td>
                          <td className="performance-branch-chevron-col" />
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </MetrioTableWrap>
    </div>
  );
}
