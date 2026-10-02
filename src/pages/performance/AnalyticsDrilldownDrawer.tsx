import { CheckCircle2, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "../../components/Drawer/Drawer";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import type { AnalyticsEvidence } from "../../domain/analytics/analyticsEvidenceTypes";
import {
  buildContextLine,
  completedCyclesCaption,
  efficiencyBreakdownRows,
  formatCycleDurationShort,
  isBackflowsZeroState,
  medianCycleMs,
  summaryLineValue,
} from "./analyticsDrawerPresentation";
import { AnalyticsIssueRow } from "./AnalyticsIssueRow";
import { EfficiencyComponentRow } from "./EfficiencyComponentRow";
import "./analytics-drilldown-drawer.css";

const PAGE_SIZE = 25;

type FirstPassFilter = "all" | "first_pass" | "rework";

function SectionHeading({ children }: { children: string }) {
  return <h3 className="analytics-drawer__section-heading">{children}</h3>;
}

function OutcomeSummary({
  evidence,
  extraRows = [],
}: {
  evidence: AnalyticsEvidence;
  extraRows?: { label: string; value: string }[];
}) {
  const lines =
    evidence.metric === "first_pass"
      ? [
          { label: "First pass", value: summaryLineValue(evidence, "First pass") },
          { label: "Rework", value: summaryLineValue(evidence, "Rework") },
          {
            label: "Completed cycles",
            value: summaryLineValue(evidence, "Completed cycles"),
          },
        ]
      : evidence.metric === "backflows" && evidence.kpi.backflowCount > 0
        ? evidence.summaryLines
        : evidence.metric === "avg_cycle"
          ? evidence.summaryLines
          : [];

  const allLines = [...lines, ...extraRows].filter(
    (line) => line.value != null && line.value !== "",
  );

  if (!allLines.length) return null;

  return (
    <div className="analytics-drawer__outcome">
      <SectionHeading>
        {evidence.metric === "first_pass" ? "Outcome" : "Summary"}
      </SectionHeading>
      <dl className="analytics-drawer__outcome-grid">
        {allLines.map((line) => (
          <div key={line.label} className="analytics-drawer__outcome-row">
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export interface AnalyticsDrilldownDrawerProps {
  open: boolean;
  evidence: AnalyticsEvidence | null;
  onClose: () => void;
  onClosed?: () => void;
  onOpenPerson: (personId: string) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function AnalyticsDrilldownDrawer({
  open,
  evidence,
  onClose,
  onClosed,
  onOpenPerson,
  returnFocusRef,
}: AnalyticsDrilldownDrawerProps) {
  const [firstPassFilter, setFirstPassFilter] = useState<FirstPassFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setFirstPassFilter("all");
      setVisibleCount(PAGE_SIZE);
      setExpandedKeys({});
    }
  }, [open, evidence?.metric, evidence?.bucketDate]);

  useEffect(() => {
    if (!open && returnFocusRef?.current) {
      returnFocusRef.current.focus();
    }
  }, [open, returnFocusRef]);

  const filteredIssues = useMemo(() => {
    if (!evidence) return [];
    if (evidence.metric !== "first_pass") return evidence.issues;
    if (firstPassFilter === "all") return evidence.issues;
    if (firstPassFilter === "first_pass") {
      return evidence.issues.filter((row) => row.outcome === "first_pass");
    }
    return evidence.issues.filter(
      (row) => row.outcome === "rework" || row.outcome === "backflow",
    );
  }, [evidence, firstPassFilter]);

  const visibleIssues = filteredIssues.slice(0, visibleCount);
  const backflowsZero = evidence ? isBackflowsZeroState(evidence) : false;

  const efficiencyPresentation = useMemo(
    () => (evidence?.metric === "efficiency" ? efficiencyBreakdownRows(evidence) : null),
    [evidence],
  );

  const avgCycleMedian = useMemo(() => {
    if (!evidence || evidence.metric !== "avg_cycle") return null;
    const values = filteredIssues
      .map((row) => row.cycleDurationMs)
      .filter((value): value is number => value != null);
    return medianCycleMs(values);
  }, [evidence, filteredIssues]);

  const handleOpenPerson = (personId: string) => {
    onClose();
    onOpenPerson(personId);
  };

  const listHeading = (() => {
    if (!evidence) return null;
    if (evidence.metric === "avg_cycle") return "Longest cycles";
    if (evidence.metric === "backflows") return "Backflow events";
    return null;
  })();

  const showOutcomeBlock =
    evidence &&
    (evidence.metric === "first_pass" ||
      (evidence.metric === "backflows" && evidence.kpi.backflowCount > 0) ||
      evidence.metric === "avg_cycle");

  const evidenceListCaption = evidence
    ? completedCyclesCaption(filteredIssues)
    : "";

  const showListCaption =
    evidence &&
    evidence.detailLevel === "task" &&
    !backflowsZero &&
    filteredIssues.length > 0 &&
    evidence.metric !== "efficiency";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      ariaLabel={evidence ? `${evidence.title} analytics detail` : "Analytics detail"}
      size="analytics"
      header={
        evidence ? (
          <div className="analytics-drawer__header">
            <div className="analytics-drawer__title-row">
              <h2 className="analytics-drawer__title">{evidence.title}</h2>
              <span className="analytics-drawer__value">{evidence.valueLabel}</span>
            </div>
            <p className="analytics-drawer__context">{buildContextLine(evidence)}</p>
          </div>
        ) : null
      }
    >
      {evidence ? (
        <div className="analytics-drawer__body">
          <p className="analytics-drawer__description">{evidence.description}</p>

          {evidence.detailLevel === "aggregate" ? (
            <div className="analytics-drawer__aggregate-state" role="status">
              <Info size={18} strokeWidth={1.75} aria-hidden />
              <div>
                <p className="analytics-drawer__aggregate-title">
                  Task-level detail unavailable
                </p>
                <p className="analytics-drawer__aggregate-copy">
                  This historical point is stored as an aggregate snapshot.{" "}
                  {evidence.aggregateNote}
                </p>
                <p className="analytics-drawer__aggregate-value">
                  {evidence.title}: {evidence.valueLabel}
                  {evidence.bucketDate ? ` · ${evidence.rangeLabel}` : null}
                </p>
              </div>
            </div>
          ) : null}

          {evidence.metric === "efficiency" && evidence.detailLevel === "task" && efficiencyPresentation ? (
            <section className="analytics-drawer__section">
              <SectionHeading>How efficiency is calculated</SectionHeading>
              <div className="analytics-drawer__efficiency-breakdown">
                {efficiencyPresentation.rows.map((row) => (
                  <EfficiencyComponentRow
                    key={row.id}
                    label={row.label}
                    points={row.points}
                    detail={row.detail}
                    isPenalty={row.isPenalty}
                  />
                ))}
                <div className="analytics-drawer__efficiency-total">
                  <span>Total score</span>
                  <span>{efficiencyPresentation.total}</span>
                </div>
              </div>
            </section>
          ) : null}

          {showOutcomeBlock ? (
            <OutcomeSummary
              evidence={evidence}
              extraRows={
                evidence.metric === "avg_cycle" && avgCycleMedian != null
                  ? [
                      {
                        label: "Median",
                        value: formatCycleDurationShort(avgCycleMedian) ?? "—",
                      },
                    ]
                  : []
              }
            />
          ) : null}

          {evidence.metric === "completed" && evidence.detailLevel === "task" ? (
            <p className="analytics-drawer__caption">{evidenceListCaption}</p>
          ) : null}

          {backflowsZero ? (
            <div className="analytics-drawer__positive-empty">
              <CheckCircle2 size={20} strokeWidth={1.75} aria-hidden />
              <div>
                <p className="analytics-drawer__positive-empty-title">
                  No backflows in this period
                </p>
                <p className="analytics-drawer__positive-empty-copy">
                  Completed work did not return to an earlier workflow stage.
                </p>
              </div>
            </div>
          ) : null}

          {evidence.metric === "first_pass" && evidence.detailLevel === "task" ? (
            <div className="analytics-drawer__filter">
              <SegmentedControl
                ariaLabel="First pass filter"
                value={firstPassFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "first_pass", label: "First pass" },
                  { value: "rework", label: "Rework" },
                ]}
                onChange={setFirstPassFilter}
              />
            </div>
          ) : null}

          {evidence.metric === "first_pass" &&
          evidence.detailLevel === "task" &&
          filteredIssues.length > 0 ? (
            <p className="analytics-drawer__caption">{evidenceListCaption}</p>
          ) : null}

          {evidence.metric === "efficiency" &&
          evidence.detailLevel === "task" &&
          evidence.issues.length > 0 ? (
            <>
              <section className="analytics-drawer__section">
                <SectionHeading>Supporting work</SectionHeading>
                <p className="analytics-drawer__caption">
                  {completedCyclesCaption(evidence.issues)}
                </p>
              </section>
              <EvidenceList
                issues={evidence.issues.slice(0, visibleCount)}
                expandedKeys={expandedKeys}
                setExpandedKeys={setExpandedKeys}
                onOpenPerson={handleOpenPerson}
                showOutcome
                metric={evidence.metric}
                totalCount={evidence.issues.length}
                visibleCount={visibleCount}
                onShowMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
              />
            </>
          ) : null}

          {!backflowsZero &&
          evidence.detailLevel === "task" &&
          evidence.metric !== "efficiency" &&
          filteredIssues.length === 0 ? (
            <p className="analytics-drawer__empty">
              {evidence.metric === "completed"
                ? "No completed work in this period."
                : evidence.metric === "first_pass"
                  ? "No completed cycles in this period."
                  : evidence.metric === "avg_cycle"
                    ? "No cycle data in this period."
                    : "No matching work in this period."}
            </p>
          ) : null}

          {!backflowsZero &&
          evidence.detailLevel === "task" &&
          evidence.metric !== "efficiency" &&
          filteredIssues.length > 0 ? (
            <>
              {listHeading ? <SectionHeading>{listHeading}</SectionHeading> : null}
              {showListCaption ? (
                <p className="analytics-drawer__caption">{evidenceListCaption}</p>
              ) : null}
              <EvidenceList
                issues={visibleIssues}
                expandedKeys={expandedKeys}
                setExpandedKeys={setExpandedKeys}
                onOpenPerson={handleOpenPerson}
                showOutcome={
                  evidence.metric === "first_pass" || evidence.metric === "completed"
                }
                metric={evidence.metric}
                totalCount={filteredIssues.length}
                visibleCount={visibleCount}
                onShowMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}

function EvidenceList({
  issues,
  expandedKeys,
  setExpandedKeys,
  onOpenPerson,
  showOutcome,
  metric,
  totalCount,
  visibleCount,
  onShowMore,
}: {
  issues: AnalyticsEvidence["issues"];
  expandedKeys: Record<string, boolean>;
  setExpandedKeys: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onOpenPerson: (personId: string) => void;
  showOutcome: boolean;
  metric: AnalyticsEvidence["metric"];
  totalCount: number;
  visibleCount: number;
  onShowMore: () => void;
}) {
  return (
    <>
      <div className="analytics-drawer__list">
        {issues.map((issue) => {
          const rowKey = `${issue.issueKey}-${issue.cycleIndex ?? 0}-${issue.completedAt ?? ""}`;
          return (
            <AnalyticsIssueRow
              key={rowKey}
              issue={issue}
              onOpenPerson={onOpenPerson}
              showOutcome={showOutcome}
              showBackflowSummary={metric === "backflows"}
              expanded={Boolean(expandedKeys[rowKey])}
              onToggleExpand={
                (issue.backflowEvents?.length ?? 0) > 0
                  ? () =>
                      setExpandedKeys((prev) => ({
                        ...prev,
                        [rowKey]: !prev[rowKey],
                      }))
                  : undefined
              }
            />
          );
        })}
      </div>
      {visibleCount < totalCount ? (
        <div className="analytics-drawer__pagination">
          <p className="analytics-drawer__pagination-meta">
            Showing {visibleCount} of {totalCount}
          </p>
          <button type="button" className="analytics-drawer__more" onClick={onShowMore}>
            Show more
          </button>
        </div>
      ) : null}
    </>
  );
}
