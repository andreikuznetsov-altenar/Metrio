import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
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

/** Must match --motion-standard (200ms) plus a small safety margin. */
const BRANCH_COLLAPSE_MS = 220;

function CollapsibleCell({
  open,
  className,
  children,
}: {
  open: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <td className={className}>
      <div className={open ? "performance-branch-collapse is-open" : "performance-branch-collapse"}>
        <div className="performance-branch-collapse__inner">
          <div className="performance-branch-collapse__content">{children}</div>
        </div>
      </div>
    </td>
  );
}

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
  // `expanded` = logical state (drives icon / aria). `mounted` keeps member rows in the DOM
  // while the close transition runs; `shown` flips one frame after mount so opening animates.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [mounted, setMounted] = useState<Set<string>>(() => new Set());
  const [shown, setShown] = useState<Set<string>>(() => new Set());
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
    };
  }, []);

  const toggleExpanded = (leaderId: string) => {
    const pending = timers.current.get(leaderId);
    if (pending !== undefined) window.clearTimeout(pending);
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const update = (set: Set<string>, add: boolean) => {
      const next = new Set(set);
      if (add) next.add(leaderId);
      else next.delete(leaderId);
      return next;
    };
    if (!expanded.has(leaderId)) {
      setExpanded((current) => update(current, true));
      setMounted((current) => update(current, true));
      if (reduced) {
        setShown((current) => update(current, true));
      } else {
        // Let the collapsed state paint first so the height transition actually runs.
        const id = window.setTimeout(() => {
          timers.current.delete(leaderId);
          setShown((current) => update(current, true));
        }, 16);
        timers.current.set(leaderId, id);
      }
    } else {
      setExpanded((current) => update(current, false));
      setShown((current) => update(current, false));
      const id = window.setTimeout(
        () => {
          timers.current.delete(leaderId);
          setMounted((current) => update(current, false));
        },
        reduced ? 0 : BRANCH_COLLAPSE_MS,
      );
      timers.current.set(leaderId, id);
    }
  };

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
                <th aria-label="Expand team" className="performance-branch-action-col" />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const members = membersByLeaderId?.[row.leaderId] ?? [];
              const isOpen = expanded.has(row.leaderId);
              const isMounted = mounted.has(row.leaderId);
              const isShown = shown.has(row.leaderId);
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
                      <td className="performance-branch-action-col">
                        {members.length > 0 ? (
                          <button
                            type="button"
                            className="performance-branch-toggle"
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? "Collapse" : "Expand"} ${row.leaderName}'s team`}
                            data-testid="leadership-branch-toggle"
                            onClick={() => toggleExpanded(row.leaderId)}
                          >
                            {isOpen ? (
                              <Minus size={16} strokeWidth={1.8} aria-hidden data-icon="minus" />
                            ) : (
                              <Plus size={16} strokeWidth={1.8} aria-hidden data-icon="plus" />
                            )}
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                  {isMounted
                    ? members.map((member) => (
                        <tr
                          key={`${row.leaderId}-${member.personId}`}
                          className={
                            isShown
                              ? "performance-branch-member-row performance-branch-member-row--open"
                              : "performance-branch-member-row"
                          }
                          data-testid="leadership-branch-member-row"
                        >
                          <CollapsibleCell open={isShown} className="performance-branch-member-row__person">
                            <PersonIdentity
                              personId={member.personId}
                              displayName={member.displayName}
                              role={member.jobTitle}
                              avatarSize="sm"
                            />
                          </CollapsibleCell>
                          <CollapsibleCell open={isShown}>Team member</CollapsibleCell>
                          <CollapsibleCell open={isShown}>{member.performanceLabel}</CollapsibleCell>
                          <CollapsibleCell open={isShown}>{member.attentionLabel}</CollapsibleCell>
                          <CollapsibleCell open={isShown}>{member.deliveryRiskCount}</CollapsibleCell>
                          <CollapsibleCell open={isShown}>
                            <CapacityBadgeMix parts={member.capacityParts} ariaLabel="Capacity" />
                          </CollapsibleCell>
                          <CollapsibleCell open={isShown}>{member.availabilityLabel}</CollapsibleCell>
                          <CollapsibleCell open={isShown} className="performance-branch-action-col">
                            {null}
                          </CollapsibleCell>
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
