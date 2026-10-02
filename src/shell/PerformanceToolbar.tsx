import { Button } from "../components/Button/Button";
import { IconButton } from "../components/IconButton/IconButton";
import { Select } from "../components/Select/Select";
import type { DateRangeKey, PerformanceReviewTarget } from "../domain/performance";
import {
  createPerformanceDateRange,
  validatePerformanceDateRange,
  type PerformanceDateRange,
} from "../domain/performance/performanceDateRange";
import "./PerformanceToolbar.css";

const DATE_RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "quarter", label: "Quarter" },
];

const TEAM_REVIEW_TARGET_OPTIONS = [
  { value: "team", label: "Team target" },
  { value: "sprint", label: "Sprint target" },
  { value: "org", label: "Org target" },
];

const EMPLOYEE_REVIEW_TARGET_OPTIONS = [
  { value: "personal", label: "Personal target" },
  { value: "sprint", label: "Sprint target" },
  { value: "quarter", label: "Quarter goal" },
];

function ExportIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="performance-toolbar__export-icon">
      <path
        d="M8 2.5v7M5 7l3 3 3-3M3.5 12.5h9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 8a5.5 5.5 0 0 1 9.2-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13.5 8A5.5 5.5 0 0 1 4.3 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11.5 2.5H13V4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 13.5H3V12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface PerformanceToolbarProps {
  dateRange: PerformanceDateRange;
  reviewTarget: PerformanceReviewTarget;
  audience: "team" | "employee";
  refreshing?: boolean;
  onDateRangeChange: (value: PerformanceDateRange) => void;
  onReviewTargetChange: (value: PerformanceReviewTarget) => void;
  onRefresh: () => void;
  onExportPdf?: () => void;
  exportDisabled?: boolean;
  exportBusy?: boolean;
  exportStatusMessage?: string | null;
}

function applyPreset(preset: DateRangeKey): PerformanceDateRange {
  return createPerformanceDateRange(preset);
}

export function PerformanceToolbar({
  dateRange,
  reviewTarget,
  audience,
  refreshing = false,
  onDateRangeChange,
  onReviewTargetChange,
  onRefresh,
  onExportPdf,
  exportDisabled = false,
  exportBusy = false,
  exportStatusMessage,
}: PerformanceToolbarProps) {
  const reviewOptions =
    audience === "employee"
      ? EMPLOYEE_REVIEW_TARGET_OPTIONS
      : TEAM_REVIEW_TARGET_OPTIONS;

  const rangeValidation = validatePerformanceDateRange(dateRange);
  const presetValue =
    dateRange.preset === "custom" ? "30d" : (dateRange.preset as DateRangeKey);

  return (
    <div className="performance-toolbar">
      <h2 className="performance-toolbar__title" aria-hidden>
        Filters
      </h2>
      <div className="performance-toolbar__controls">
        <div className="performance-toolbar__field performance-toolbar__field--date">
          <label className="performance-toolbar__date-label" htmlFor="perf-from">
            From
          </label>
          <input
            id="perf-from"
            type="date"
            className="performance-toolbar__date-input"
            value={dateRange.from}
            onChange={(event) =>
              onDateRangeChange({
                ...dateRange,
                from: event.target.value,
                preset: "custom",
              })
            }
          />
        </div>
        <div className="performance-toolbar__field performance-toolbar__field--date">
          <label className="performance-toolbar__date-label" htmlFor="perf-to">
            To
          </label>
          <input
            id="perf-to"
            type="date"
            className="performance-toolbar__date-input"
            value={dateRange.to}
            onChange={(event) =>
              onDateRangeChange({
                ...dateRange,
                to: event.target.value,
                preset: "custom",
              })
            }
          />
        </div>
        <div className="performance-toolbar__field">
          <Select
            aria-label="Date range preset"
            value={dateRange.preset === "custom" ? "custom" : presetValue}
            options={[
              ...DATE_RANGE_OPTIONS,
              { value: "custom", label: "Custom" },
            ]}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "custom") return;
              onDateRangeChange(applyPreset(value as DateRangeKey));
            }}
          />
        </div>
        <div className="performance-toolbar__field performance-toolbar__field--wide">
          <Select
            aria-label="Review target"
            value={reviewTarget}
            options={reviewOptions}
            onChange={(event) =>
              onReviewTargetChange(
                event.target.value as PerformanceReviewTarget,
              )
            }
          />
        </div>
        <div
          className={
            refreshing
              ? "performance-toolbar__refresh is-refreshing"
              : "performance-toolbar__refresh"
          }
        >
          <IconButton
            label="Refresh"
            onClick={onRefresh}
            disabled={refreshing || !rangeValidation.valid}
          >
            <RefreshIcon />
          </IconButton>
        </div>
        {onExportPdf ? (
          <div className="performance-toolbar__export">
            <Button
              type="button"
              variant="secondary"
              disabled={exportDisabled || exportBusy || !rangeValidation.valid}
              onClick={onExportPdf}
            >
              <ExportIcon />
              {exportBusy ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        ) : null}
      </div>
      {exportStatusMessage ? (
        <p className="performance-toolbar__status" role="status" aria-live="polite">
          {exportStatusMessage}
        </p>
      ) : null}
      {!rangeValidation.valid && rangeValidation.message ? (
        <p className="performance-toolbar__status performance-toolbar__status--error" role="status">
          {rangeValidation.message}
        </p>
      ) : null}
    </div>
  );
}
