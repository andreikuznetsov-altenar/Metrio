# Return-from-leave work summary (Phase 24)

## Feasibility

Jira changelog is already normalized into `IssueEvent` on each `AuditIssue` (`events` / `rangeEvents`). We can detect changes that occurred during a Bamboo leave interval without new APIs.

## Implemented

- `summarizeChangesWhileAway` scans `person.issues` events between leave start and end (calendar dates, inclusive).
- Counts status changes, completions (transition to Done-like status), and assignee changes to the current user.
- Shown in employee overview only when `availability.state === "returns_today"` and the summary is non-empty.

## Not implemented

- Comment-only activity (no comments API in scope).
- “Changed while away” beyond the return day (would need persisted “last seen return” state).
