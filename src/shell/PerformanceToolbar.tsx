import { CalendarDays, Download, RefreshCw } from "lucide-react";
import { Button } from "../components/Button/Button";
import { IconButton } from "../components/IconButton/IconButton";
import { Select } from "../components/Select/Select";
import type { DateRangeKey, PerformanceReviewTarget } from "../domain/performance";
import {
  createPerformanceDateRange,
  formatPerformanceDateDisplay,
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
  return <Download size={16} strokeWidth={1.75} aria-hidden className="performance-toolbar__export-icon" />;
}

function RefreshIcon() {
  return <RefreshCw size={16} strokeWidth={1.75} aria-hidden />;
}

export interface PerformanceToolbarProps {
  dateRange: PerformanceDateRange;
  reviewTarget: PerformanceReviewTarget;
  audience: "team" | "employee";
  refreshing?: boolean;
  controlsDisabled?: boolean;
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

function PerformanceDateField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (iso: string) => void;
}) {
  return (
    <div className="performance-toolbar__field performance-toolbar__field--date">
      <label className="performance-toolbar__date-label" htmlFor={id}>
        {label}
      </label>
      <div className="performance-toolbar__date-control">
        <CalendarDays
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="performance-toolbar__date-icon"
        />
        <span className="performance-toolbar__date-display" aria-hidden="true">
          {formatPerformanceDateDisplay(value) || "Select date"}
        </span>
        <input
          id={id}
          type="date"
          className="performance-toolbar__date-input"
          value={value}
          disabled={disabled}
          aria-label={`${label} date`}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export function PerformanceToolbar({
  dateRange,
  reviewTarget,
  audience,
  refreshing = false,
  controlsDisabled = false,
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
  const inputsDisabled = controlsDisabled || !rangeValidation.valid;
  const presetValue =
    dateRange.preset === "custom" ? "30d" : (dateRange.preset as DateRangeKey);

  return (
    <div className="performance-toolbar">
      <h2 className="performance-toolbar__title" aria-hidden>
        Filters
      </h2>
      <div className="performance-toolbar__controls">
        <div className="performance-toolbar__group performance-toolbar__group--dates">
          <PerformanceDateField
            id="perf-from"
            label="From"
            value={dateRange.from}
            disabled={inputsDisabled}
            onChange={(from) =>
              onDateRangeChange({
                ...dateRange,
                from,
                preset: "custom",
              })
            }
          />
          <PerformanceDateField
            id="perf-to"
            label="To"
            value={dateRange.to}
            disabled={inputsDisabled}
            onChange={(to) =>
              onDateRangeChange({
                ...dateRange,
                to,
                preset: "custom",
              })
            }
          />
        <div className="performance-toolbar__field">
          <Select
            aria-label="Date range preset"
            value={dateRange.preset === "custom" ? "custom" : presetValue}
            disabled={controlsDisabled}
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
        </div>
        <div className="performance-toolbar__group performance-toolbar__group--analysis">
        <div className="performance-toolbar__field performance-toolbar__field--wide">
          <Select
            aria-label="Review target"
            value={reviewTarget}
            disabled={controlsDisabled}
            options={reviewOptions}
            onChange={(event) =>
              onReviewTargetChange(
                event.target.value as PerformanceReviewTarget,
              )
            }
          />
        </div>
        </div>
        <div className="performance-toolbar__group performance-toolbar__group--actions">
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
            disabled={inputsDisabled}
          >
            <RefreshIcon />
          </IconButton>
        </div>
        {onExportPdf ? (
          <div className="performance-toolbar__export">
            <Button
              type="button"
              variant="secondary"
              disabled={exportDisabled || exportBusy || inputsDisabled}
              onClick={onExportPdf}
            >
              <ExportIcon />
              {exportBusy ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        ) : null}
        </div>
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
