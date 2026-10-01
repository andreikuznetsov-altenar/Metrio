import { IconButton } from "../components/IconButton/IconButton";
import { Select } from "../components/Select/Select";
import type {
  DateRangeKey,
  PerformanceReviewTarget,
} from "../domain/performance";
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
  dateRange: DateRangeKey;
  reviewTarget: PerformanceReviewTarget;
  audience: "team" | "employee";
  refreshing?: boolean;
  onDateRangeChange: (value: DateRangeKey) => void;
  onReviewTargetChange: (value: PerformanceReviewTarget) => void;
  onRefresh: () => void;
}

export function PerformanceToolbar({
  dateRange,
  reviewTarget,
  audience,
  refreshing = false,
  onDateRangeChange,
  onReviewTargetChange,
  onRefresh,
}: PerformanceToolbarProps) {
  const reviewOptions =
    audience === "employee"
      ? EMPLOYEE_REVIEW_TARGET_OPTIONS
      : TEAM_REVIEW_TARGET_OPTIONS;

  return (
    <div className="performance-toolbar">
      <h2 className="performance-toolbar__title">Performance</h2>
      <div className="performance-toolbar__controls">
        <div className="performance-toolbar__field">
          <Select
            aria-label="Date range"
            value={dateRange}
            options={DATE_RANGE_OPTIONS}
            onChange={(event) =>
              onDateRangeChange(event.target.value as DateRangeKey)
            }
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
        <div className="performance-toolbar__refresh">
          <IconButton
            label="Refresh"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshIcon />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
