import { CheckCircle2, Info } from "lucide-react";
import { Badge } from "../../components/Badge/Badge";
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "../../components/Drawer/Drawer";
import { DrawerPanelPlaceholder } from "../../components/Drawer/DrawerPanelPlaceholder";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import type { AnalyticsEvidence } from "../../domain/analytics/analyticsEvidenceTypes";
import {
  buildContextLine,
  completedCyclesCaption,
  efficiencyBreakdownRows,
  formatCycleDurationShort,
  isBackflowsZeroState,
  medianCycleMs,
  shouldShowEvidenceListCaption,
  summaryLineValue,
} from "./analyticsDrawerPresentation";
import { AnalyticsIssueRow } from "./AnalyticsIssueRow";
import "./analytics-drilldown-drawer.css";

const PAGE_SIZE = 25;

type FirstPassFilter = "all" | "first_pass" | "rework";

function SectionHeading({ children }: { children: string }) {
  return <h3 className="analytics-drawer__section-heading">{children}</h3>;
}

function AnalyticsDrawerIntro({ evidence }: { evidence: AnalyticsEvidence }) {
  const backflowsZero = isBackflowsZeroState(evidence);
  return (
    <section className="analytics-drawer__intro-card" data-testid="analytics-drawer-intro">
      {evidence.personDisplayName ? (
        <p className="analytics-drawer__intro-person">{evidence.personDisplayName}</p>
      ) : null}
      <div className="analytics-drawer__intro-metric">
        <h2 className="analytics-drawer__intro-title">{evidence.title}</h2>
        <p className="analytics-drawer__intro-value">{evidence.valueLabel}</p>
      </div>
      <p className="analytics-drawer__intro-context">{buildContextLine(evidence)}</p>
      <p className="analytics-drawer__description">{evidence.description}</p>
      {backflowsZero ? (
        <div className="analytics-drawer__summary-status" role="status">
          <Badge variant="success">Healthy</Badge>
          <span>No backflows in this period</span>
        </div>
      ) : null}
    </section>
  );
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
    <section className="analytics-drawer__card analytics-drawer__outcome">
      <SectionHeading>
        {evidence.metric === "first_pass" ? "Outcome" : "Summary"}
      </SectionHeading>
      <table className="performance-table analytics-drawer__outcome-table">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col" className="performance-table__num">Value</th>
          </tr>
        </thead>
        <tbody>
          {allLines.map((line) => (
            <tr key={line.label}>
              <td>{line.label}</td>
              <td className="performance-table__num">{line.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
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

  const showEvidenceListCaption =
    evidence &&
    shouldShowEvidenceListCaption(evidence, filteredIssues.length, backflowsZero);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      ariaLabel={evidence ? `${evidence.title} analytics detail` : "Analytics detail"}
      size="analytics"
    >
      {evidence ? (
        <div
          className={
            evidence.detailLevel === "aggregate"
              ? "analytics-drawer__body analytics-drawer__body--aggregate"
              : "analytics-drawer__body"
          }
        >
          <AnalyticsDrawerIntro evidence={evidence} />

          {evidence.detailLevel === "aggregate" ? (
            <DrawerPanelPlaceholder
              className="analytics-drawer__aggregate-placeholder"
              icon={<Info size={24} strokeWidth={1.75} aria-hidden />}
              title="Task-level detail unavailable"
              copy={evidence.aggregateNote}
            />
          ) : null}

          {evidence.metric === "efficiency" && evidence.detailLevel === "task" && efficiencyPresentation ? (
            <section className="analytics-drawer__card analytics-drawer__section">
              <SectionHeading>How efficiency is calculated</SectionHeading>
              <table className="performance-table analytics-drawer__efficiency-table">
                <thead>
                  <tr>
                    <th scope="col">Component</th>
                    <th scope="col" className="performance-table__num">Value</th>
                    <th scope="col">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {efficiencyPresentation.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.label}</td>
                      <td className="performance-table__num">{row.points}</td>
                      <td>{row.detail ?? "—"}</td>
                    </tr>
                  ))}
                  <tr className="analytics-drawer__efficiency-total-row">
                    <td>Total score</td>
                    <td className="performance-table__num">{efficiencyPresentation.total}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
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

          {backflowsZero ? (
            <DrawerPanelPlaceholder
              className="analytics-drawer__positive-empty"
              icon={<CheckCircle2 size={24} strokeWidth={1.75} aria-hidden />}
              title="No backflows in this period"
              copy="Completed work did not return to an earlier workflow stage."
            />
          ) : null}

          {evidence.metric === "first_pass" && evidence.detailLevel === "task" ? (
            <div className="analytics-drawer__filter">
              <SegmentedControl
                ariaLabel="First pass filter"
                fullWidth
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
            <DrawerPanelPlaceholder
              className="analytics-drawer__empty"
              compact
              title={
                evidence.metric === "completed"
                  ? "No completed work in this period."
                  : evidence.metric === "first_pass"
                    ? "No completed cycles in this period."
                    : evidence.metric === "avg_cycle"
                      ? "No cycle data in this period."
                      : "No matching work in this period."
              }
            />
          ) : null}

          {evidence.metric === "backflows" &&
          evidence.bucketDate &&
          evidence.detailLevel === "task" &&
          filteredIssues.length > 0 ? (
            <p className="analytics-drawer__caption" role="note">
              Trend point counts backflow events (not cycles with backflow).
            </p>
          ) : null}

          {!backflowsZero &&
          evidence.detailLevel === "task" &&
          evidence.metric !== "efficiency" &&
          filteredIssues.length > 0 ? (
            <>
              {listHeading ? <SectionHeading>{listHeading}</SectionHeading> : null}
              {showEvidenceListCaption ? (
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
      <div className="analytics-drawer__card analytics-drawer__list">
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
