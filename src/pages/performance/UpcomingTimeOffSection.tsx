import { bambooEmployeePortalUrl } from "../../config/bambooPortal";
import type { EmployeePerformanceSnapshot } from "../../domain/performance";
import type { Person } from "../../domain/people/types";
import type { PreLeaveWorkSummary } from "../../domain/availability/preLeaveWork";
import {
  shouldOfferReturnSummary,
  summarizeChangesWhileAway,
} from "../../domain/availability/changedWhileAway";
import { Button } from "../../components/Button/Button";
import { EmployeeCurrentWorkList } from "./EmployeeCurrentWorkList";
import { resolveJiraBaseUrl } from "../../config/product";
import { openExternalUrl } from "../../platform/openExternal";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { loadPreferences } from "../../platform/preferences";

async function openIssueInJira(issueKey: string) {
  const prefs = await loadPreferences();
  const url = buildJiraIssueBrowseUrl(resolveJiraBaseUrl(prefs), issueKey);
  await openExternalUrl(url);
}

export interface UpcomingTimeOffSectionProps {
  person: Person;
  timeOff: EmployeePerformanceSnapshot["timeOff"];
  preLeave: PreLeaveWorkSummary | null;
  returnSummary?: ReturnType<typeof summarizeChangesWhileAway>;
  onViewAllWork: () => void;
}

export function UpcomingTimeOffSection({
  person,
  timeOff,
  preLeave,
  returnSummary,
  onViewAllWork,
}: UpcomingTimeOffSectionProps) {
  const showReturn =
    shouldOfferReturnSummary(person) &&
    returnSummary &&
    (returnSummary.statusChangeCount > 0 ||
      returnSummary.completedCount > 0 ||
      returnSummary.assignedToYouCount > 0);

  if (!timeOff && !showReturn) {
    return (
      <section aria-label="Upcoming time off" className="performance-section">
        <h3 className="performance-section__title">Upcoming time off</h3>
        <p className="performance-inline-empty">No upcoming time off.</p>
      </section>
    );
  }

  return (
    <section aria-label="Upcoming time off" className="performance-section">
      {showReturn ? (
        <>
          <h3 className="performance-section__title">Welcome back</h3>
          <div className="performance-timeoff-compact performance-timeoff-compact--return">
            <p className="performance-timeoff-compact__range">While you were away</p>
            <ul className="performance-timeoff-return-stats">
              {returnSummary!.statusChangeCount > 0 ? (
                <li>
                  {returnSummary!.statusChangeCount} task
                  {returnSummary!.statusChangeCount === 1 ? "" : "s"} changed status
                </li>
              ) : null}
              {returnSummary!.completedCount > 0 ? (
                <li>
                  {returnSummary!.completedCount} task
                  {returnSummary!.completedCount === 1 ? "" : "s"} completed
                </li>
              ) : null}
              {returnSummary!.assignedToYouCount > 0 ? (
                <li>
                  {returnSummary!.assignedToYouCount} task
                  {returnSummary!.assignedToYouCount === 1 ? "" : "s"} assigned to you
                </li>
              ) : null}
            </ul>
            {returnSummary!.rows.length > 0 ? (
              <ul className="performance-timeoff-return-rows">
                {returnSummary!.rows.map((row) => (
                  <li key={`${row.issueKey}-${row.label}`}>
                    <button
                      type="button"
                      className="performance-link-button"
                      onClick={() => void openIssueInJira(row.issueKey)}
                    >
                      {row.issueKey}
                    </button>
                    <span className="performance-timeoff-item__meta"> · {row.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}

      {timeOff ? (
        <>
          <h3 className="performance-section__title">Upcoming time off</h3>
          <div className="performance-timeoff-compact" data-testid="employee-upcoming-time-off">
            <div className="performance-timeoff-compact__range">
              {timeOff.headline || timeOff.rangeLabel}
            </div>
            {preLeave && preLeave.activeCount > 0 ? (
              <p className="performance-timeoff-compact__note">
                {preLeave.activeCount} active task{preLeave.activeCount === 1 ? "" : "s"}
                {preLeave.inReviewCount > 0
                  ? ` · ${preLeave.inReviewCount} currently in Review`
                  : ""}
              </p>
            ) : timeOff.note ? (
              <p className="performance-timeoff-compact__note">{timeOff.note}</p>
            ) : null}

            {preLeave && preLeave.rows.length > 0 ? (
              <>
                <h4 className="performance-section__subtitle">Active work before time off</h4>
                <EmployeeCurrentWorkList rows={preLeave.rows} />
              </>
            ) : null}

            <div className="performance-timeoff-compact__actions">
              <Button variant="secondary" onClick={onViewAllWork}>
                View my work
              </Button>
              <Button
                variant="ghost"
                onClick={() => void openExternalUrl(bambooEmployeePortalUrl())}
              >
                Open BambooHR
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
