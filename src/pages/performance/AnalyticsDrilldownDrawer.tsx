import { useEffect, useMemo, useState } from "react";
import { Drawer } from "../../components/Drawer/Drawer";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import type { AnalyticsEvidence } from "../../domain/analytics/analyticsEvidenceTypes";
import { AnalyticsIssueRow } from "./AnalyticsIssueRow";
import "./analytics-drilldown-drawer.css";

const PAGE_SIZE = 25;

type FirstPassFilter = "all" | "first_pass" | "rework";

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

  const emptyCopy = (() => {
    if (!evidence) return "";
    if (evidence.detailLevel === "aggregate") return evidence.aggregateNote || "";
    if (evidence.metric === "completed") return "No completed work in this period.";
    if (evidence.metric === "backflows") return "No backflows in this period.";
    if (evidence.metric === "first_pass") return "No completed cycles in this period.";
    if (evidence.metric === "avg_cycle") return "No cycle data in this period.";
    return "No supporting work in this period.";
  })();

  const handleOpenPerson = (personId: string) => {
    onClose();
    onOpenPerson(personId);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      ariaLabel={evidence ? `${evidence.title} analytics detail` : "Analytics detail"}
      className="drawer--analytics"
      header={
        evidence ? (
          <div className="analytics-drawer__header">
            <div className="analytics-drawer__title-row">
              <h2 className="analytics-drawer__title">
                {evidence.title}
              </h2>
              <span className="analytics-drawer__value">{evidence.valueLabel}</span>
            </div>
            <p className="analytics-drawer__range">{evidence.rangeLabel}</p>
            <p className="analytics-drawer__context">
              {evidence.targetLabel}
              {evidence.comparisonLabel ? ` · ${evidence.comparisonLabel}` : null}
            </p>
            <p className="analytics-drawer__description">{evidence.description}</p>
          </div>
        ) : null
      }
    >
      {evidence ? (
        <div className="analytics-drawer__body">
          {evidence.summaryLines.length ? (
            <dl className="analytics-drawer__summary">
              {evidence.summaryLines.map((line) => (
                <div key={line.label} className="analytics-drawer__summary-row">
                  <dt>{line.label}</dt>
                  <dd>{line.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {evidence.efficiencyComponents?.length ? (
            <ul className="analytics-drawer__components">
              {evidence.efficiencyComponents.map((component) => (
                <li key={component.id}>
                  <span className="analytics-drawer__component-label">{component.label}</span>
                  <span className="analytics-drawer__component-value">{component.valueLabel}</span>
                  {component.detail ? (
                    <span className="analytics-drawer__component-detail">{component.detail}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {evidence.metric === "first_pass" && evidence.detailLevel === "task" ? (
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
          ) : null}

          {evidence.detailLevel === "aggregate" ? (
            <p className="analytics-drawer__aggregate">{emptyCopy}</p>
          ) : filteredIssues.length === 0 ? (
            <p className="analytics-drawer__empty">{emptyCopy}</p>
          ) : (
            <>
              <p className="analytics-drawer__count">
                {evidence.metric === "completed"
                  ? `${filteredIssues.length} completed cycle${filteredIssues.length === 1 ? "" : "s"}`
                  : `${filteredIssues.length} item${filteredIssues.length === 1 ? "" : "s"}`}
              </p>
              <div className="analytics-drawer__list">
                {visibleIssues.map((issue) => {
                  const rowKey = `${issue.issueKey}-${issue.cycleIndex ?? 0}-${issue.completedAt ?? ""}`;
                  return (
                    <AnalyticsIssueRow
                      key={rowKey}
                      issue={issue}
                      onOpenPerson={handleOpenPerson}
                      showOutcome={
                        evidence.metric === "first_pass" || evidence.metric === "completed"
                      }
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
              {visibleCount < filteredIssues.length ? (
                <button
                  type="button"
                  className="analytics-drawer__more"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                >
                  Show more
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}
