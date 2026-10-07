import { Download, Loader2, RefreshCw } from "lucide-react";
import { MetrioDatePicker } from "../components/DatePicker/MetrioDatePicker";
import { Button } from "../components/Button/Button";
import { IconButton } from "../components/IconButton/IconButton";
import { Select } from "../components/Select/Select";
import type { DateRangeKey, PerformanceReviewTarget } from "../domain/performance";
import {
  createPerformanceDateRange,
  DATE_RANGE_PRESET_OPTIONS,
  isKnownDateRangePreset,
  validatePerformanceDateRange,
  type PerformanceDateRange,
} from "../domain/performance/performanceDateRange";
import "./PerformanceToolbar.css";

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
}

function applyPreset(preset: DateRangeKey): PerformanceDateRange {
  return createPerformanceDateRange(preset);
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
}: PerformanceToolbarProps) {
  const reviewOptions =
    audience === "employee"
      ? EMPLOYEE_REVIEW_TARGET_OPTIONS
      : TEAM_REVIEW_TARGET_OPTIONS;

  const rangeValidation = validatePerformanceDateRange(dateRange);
  const datesEditable = !controlsDisabled;
  const actionsDisabled = controlsDisabled || !rangeValidation.valid;
  const presetSelectValue = isKnownDateRangePreset(dateRange.preset)
    ? dateRange.preset
    : "";

  return (
    <div className="performance-toolbar">
      <div className="performance-toolbar__controls">
        <div className="performance-toolbar__group performance-toolbar__group--dates">
          <MetrioDatePicker
            id="perf-from"
            label="From"
            value={dateRange.from}
            disabled={!datesEditable}
            onChange={(from) =>
              onDateRangeChange({
                ...dateRange,
                from,
                preset: "custom",
              })
            }
          />
          <span className="performance-toolbar__date-sep" aria-hidden>
            –
          </span>
          <MetrioDatePicker
            id="perf-to"
            label="To"
            value={dateRange.to}
            disabled={!datesEditable}
            onChange={(to) =>
              onDateRangeChange({
                ...dateRange,
                to,
                preset: "custom",
              })
            }
          />
        </div>
        <div className="performance-toolbar__field performance-toolbar__field--preset">
          <Select
            aria-label="Date range preset"
            value={presetSelectValue}
            allowEmpty
            placeholder=" "
            disabled={controlsDisabled}
            options={DATE_RANGE_PRESET_OPTIONS}
            onChange={(event) => {
              onDateRangeChange(applyPreset(event.target.value as DateRangeKey));
            }}
          />
        </div>
        <div className="performance-toolbar__field performance-toolbar__field--target">
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
            disabled={actionsDisabled}
          >
            <RefreshCw size={16} strokeWidth={1.75} aria-hidden />
          </IconButton>
        </div>
        {onExportPdf ? (
          <div className="performance-toolbar__export">
            <Button
              type="button"
              variant={exportBusy ? "secondary" : "primary"}
              className={
                exportBusy ? "performance-toolbar__export-btn performance-toolbar__export-btn--busy" : "performance-toolbar__export-btn"
              }
              disabled={exportDisabled || exportBusy || actionsDisabled}
              aria-busy={exportBusy || undefined}
              onClick={onExportPdf}
            >
              {exportBusy ? (
                <Loader2
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden
                  className="performance-toolbar__export-spinner"
                />
              ) : (
                <Download
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden
                  className="performance-toolbar__export-icon"
                />
              )}
              Export PDF
            </Button>
          </div>
        ) : null}
      </div>
      {!rangeValidation.valid && rangeValidation.message ? (
        <p className="performance-toolbar__status performance-toolbar__status--error" role="status">
          {rangeValidation.message}
        </p>
      ) : null}
    </div>
  );
}
