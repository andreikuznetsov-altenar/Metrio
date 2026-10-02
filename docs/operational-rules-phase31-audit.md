# Phase 31 — operational thresholds audit

Audit of hard-coded attention thresholds before centralization. **KPI metrics** (`buildKpiFromIssues`, efficiency, `reportFilters.targetReviewDays` in report policy) are **not** listed here — they stay canonical.

| File | Rule | Value | Consumers |
|------|------|-------|-----------|
| `task-health/taskHealthEngine.ts` | No activity days | 7 (`DEFAULT_TASK_HEALTH_THRESHOLDS.noActivityDays`) | Task health, Radar via `classifyIssueAttention`, workload problematic counts |
| `task-health/taskHealthEngine.ts` | At-risk stage ratio | 0.75 × `params.targetReviewDays` | Task health `at_risk` / `problematic` (uses **performance target**, not attention prefs) |
| `radar/taskSignals.ts` | Review attention | `stageDays >= params.targetReviewDays` | Radar, Delivery Risk, Person analytics, Project cockpit signals |
| `radar/taskSignals.ts` | In Progress attention | `stageDays >= targetReviewDays + 2` | Same |
| `radar/taskSignals.ts` | Generic stage age warning | `stageDays >= params.targetReviewDays` | Same |
| `actions/buildTeamActions.ts` | Stale Review team action | `>= 7` days in Review | Team Actions |
| `home/buildHomeWorkspace.ts` | Long Review in delivery summary | `>= 7` days | Home delivery summary |
| `projectCockpit/buildHomeProjectSignals.ts` | Long Review project signal | `>= 2` tasks with `>= 7` days | Home project signals |
| `people/availability.ts` | Vacation soon window | within **7** days | Person availability state `vacation_soon` |
| `people/availability.ts` | Vacation tomorrow | start === tomorrow | `vacation_tomorrow` |
| `actions/buildTeamActions.ts` | Upcoming leave action horizon | `<= 14` days, severity if `<= 5` days | Team Actions |
| `availability/teamAvailabilityContext.ts` | Manager availability preview | `<= 21` days, risk if `<= 5` | Performance overview, Home |
| `organization/buildOrganizationSignals.ts` | Review bottleneck | `>= 5` in review | Org signals |
| `workload/workloadEngine.ts` | Overloaded / high thresholds | `DEFAULT_WORKLOAD_THRESHOLDS` | Workload level, Team Actions workload — **fixed** (not user-editable in Phase 31) |

## Team Actions categories (informational)

| Kind | Source | Toggle target (Phase 31) |
|------|--------|---------------------------|
| `workload` | Jira workload | `actions.showWorkload` |
| `upcoming_leave` / `leave_delivery_risk` | Bamboo time off | `actions.showUpcomingLeave` |
| `feedback_*` | Feedback summary | `actions.showFeedback` |
| Stale review aggregate | Delivery risk | Always on (task attention) |

## Notification transitions

| File | Behavior |
|------|----------|
| `platform/notifications.ts` | Workload level change, vacation states, problematic count increase, per-issue `problematic` health transition |

## Notification rebase (Phase 31)

When attention rules are saved, `notificationState.workloadLevels` keys that track per-issue health (`personId:issueKey`) are cleared. Person-level workload and vacation dedupe keys are kept so alerts are not replayed in bulk.

## Migration note

Operational **review attention** previously followed `params.targetReviewDays` (performance report target, often 3). **Long review** highlights used **7** days. Defaults preserve both via `reviewAttentionDays: 3` and `longReviewHighlightDays: 7`.
