# Metrics Methodology V2

Methodology version: **2**. This document defines the production performance metrics. Legacy Google Apps Script scores remain available only as audit references.

## Canonical definitions

| Metric | Definition | Period rule | Primary aggregation |
| --- | --- | --- | --- |
| Started | A contributor cycle that enters a profile's hands-on execution state | Cycle start occurs in the selected period, whether or not it later completes | Count cycles |
| Completed | A unique work item entering a successful profile completion state | Count each successful completion cycle whose completion occurs in the selected period; a reopen and later recompletion is a new cycle | Count cycles; dedupe shared Jira issues at team scope |
| Throughput | Successfully completed work units in the reporting period | Same completed-cycle population; raw count is not an efficiency score | Sum completed work units |
| First Pass | Completed cycles with no qualifying rework transition | `firstPassCompleted / completedCycles` | Sum numerators and denominators, then divide |
| Rework Rate | Completed cycles with at least one qualifying rework transition | `reworkedCycles / completedCycles`; complement of First Pass on the same population | Sum numerators and denominators, then divide |
| Backflow Events | Qualifying backward workflow transitions occurring in the selected period | Event timestamp is in the period; three events in one cycle count as three | Sum events |
| Execution Time | Business-window elapsed time in hands-on stages, attributed to the assignee owning each interval | Completed contributor cycles in the period | Median primary; mean and sample count diagnostic |
| Cycle Time | Business-window elapsed time from contributor-cycle start to successful completion | Completed cycles with a measurable start | Median primary; mean and sample count diagnostic |
| Review Time | Business-window latency while the issue is in review/approval stages | Completed cycles with review exposure | Median primary; not human effort |
| Rework Duration | Business-window elapsed time from a qualifying return to hands-on until successful completion | Reworked completed cycles | Median primary |
| Hold / Waiting | Business-window latency in hold and waiting/QA stages | Tracked separately | Median primary; excluded from execution |

Cancellation and rejection do not complete a cycle. If cached Jira history starts with an observed completion and the start is unavailable, the completion is counted but no duration is fabricated.

## Attribution

- Execution intervals are split at assignee changes and attributed to the assignee at that time.
- A completion cycle belongs to the contributor with the largest hands-on execution segment. Ties are deterministic. If there is no measurable execution segment, completion-time assignee is used, then start-time assignee.
- Historical payloads without reconstructable assignee history retain an explicitly unattributed fallback instead of silently losing the outcome.
- Team aggregation flattens unique issue keys before extracting cycles. It never sums duplicated person issue lists or averages person percentages.

## Efficiency decision

The universal **Efficiency Index was removed from production presentation**. The UX and WSkins formulas are different, uncalibrated scoring systems; equal numeric scores do not represent an equal quantity. Averaging them would be misleading. The score formulas and the `efficiencyIndex` / `backflowCount` fields live only under `src/domain/legacy/` (and the GS reference ports in `src/domain/parity/legacy/`), exposed through a single compatibility type, `LegacyKpiData`, and a single projection, `toLegacyKpiView`. Production `KpiData` has neither field, there is no Efficiency drill-down, and nothing is shown in Dashboard, Performance, People, tray, exports, or PDF output. A guard test enforces this boundary.

The production presentation uses transparent primitives: Throughput, First Pass, Rework Rate, Backflow Events, Median Execution Time, Median Cycle Time, and Median Review Time.

## Defects corrected

1. `startedCount` was largely derived while processing completions, making completion/start approach 100% automatically. Starts are now selected independently by start timestamp.
2. Backflow cycle count and event count shared one ambiguous field. They are now `reworkedCycleCount` and `backflowEventCount`.
3. Hold, external approval waits, and administrative moves could be treated as rework. Qualification now comes from workflow semantics.
4. A profile duration statistic was overwritten by the final cycle. Durations now aggregate raw samples and compute medians/means once.
5. Skewed durations were presented as averages. Median is now primary and mean remains diagnostic.
6. Team/person values could be composed from already-aggregated scores. Primitive numerators, denominators, and raw duration samples now aggregate directly.
7. Completion attribution could follow today's assignee or every person who touched an issue. Cycles now have explicit ownership and execution segments are split by assignee.
8. Shared team issues could be double-counted through person lists. Team issue universes are deduplicated before cycle extraction.
9. UX and WSkins scores could be averaged despite incompatible definitions. No mixed universal score is produced.
10. Historical daily flow used a separate legacy completion/health path. It now uses the same canonical cycle extractor.

## Formula change summary

| Area | Before | V2 |
| --- | --- | --- |
| Summary score | UX `35 completion + 35 first pass + 30 speed - backflow penalty`; separate WSkins formula; mixed scores averaged | Removed from production UI; primitives shown |
| Started | Commonly incremented from completed-cycle processing | Independent execution-entry cohort |
| First Pass denominator | Could inherit started/completed ambiguity | Completed cycles only |
| Rework | Ambiguous with event count | Reworked completed cycles |
| Backflow | One field used for events and affected cycles | Explicit event count, separate cycle count |
| Durations | Means and sometimes last-cycle overwrite | Raw samples; median primary, mean diagnostic |
| Team values | Risk of average-of-averages and duplicated person issues | Unique issues plus summed primitives/raw samples |

## Workflow compatibility matrix

| Project/profile | Cycle start | Hands-on | Review / QA / waiting | Successful completion | Qualifying rework | Cancellation | Comparable metrics |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UX (`ux`, `design_review`) | backlog → active | Draft, In Progress, Need to Fix | Review/In Review; Pending waits; Hold excluded | Approved, Published, Done, Closed | semantic review → active | Cancelled/Canceled | First Pass, execution, cycle, review |
| AGTC Provider / design | backlog/provider → active | In Progress, Need to Fix | In Review; On Hold excluded | Done/approved profile terminal | review → active | Cancelled | First Pass, execution, cycle, review |
| AIVA design | backlog → active | Draft/In Progress/Need to Fix | design review; waiting/hold excluded | Approved/Done | review → active | Cancel/Cancelled | First Pass, execution, cycle, review |
| WS Skin | Not started/To Do → In Progress | In Progress | Internal Review/On Hold is the profile completion boundary; approval/PRE-LIVE/Live are downstream waits | active → internal-review/hold boundary | downstream hold/wait → active restart is explicit rework | no fabricated terminal | Profile-specific cycles; no mixed score |
| WS Sub-task | To Do → In Progress | In Progress | On approval waits | Done | approval → active | Cancelled | First Pass, execution, cycle |
| AGP Development | backlog → In Progress | In Progress | Code Review; QA; merged/ready waits | Closed | review/QA → active when semantic | profile terminal rules | First Pass and durations where full cycle exists |
| ADF Dev/QA | backlog → development | Development/In Progress | Code Review, QA; release waits; blocked/hold excluded | Released/Done | review/QA → active | Cancelled/Rejected | First Pass and durations where full cycle exists |
| ADF Incident | To Do → In Progress | In Progress | Waiting for User Story excluded | Done | only semantic return to active | Rejected | Throughput/execution; review metrics may be unavailable |
| PRD phased/discovery/task | backlog → analysis/active | Analysis, technical analysis, development | review/handover/QA according to profile; external approvals excluded | Completed | review/reserve → active only | Cancelled/Discarded/Not Required | Primitive metrics; unavailable durations remain unavailable |
| ARCH governance | Draft/backlog → In Progress | In Progress | comments/review can reserve; start/approval requests are external wait | Approved/Published/Archived/Done | comments/review → active, not approval wait | Rejected/Cancelled | Primitive metrics; review latency not effort |
| CRC editorial | backlog → Translation/Writing | Translation, Writing, Update needed | Editing/Proofreading; publish-ready QA | Published/Publish | review/QA → active | Cancelled | First Pass, execution, cycle, review |
| CIT delivery/purchase/security | backlog/open → active | In Progress, Investigating, Applying Patch | UAT/scan QA; purchase approval is external wait; order placed waits | deployed/ongoing/delivered/done | semantic review/QA → active; approval wait excluded | Cancelled | Primitive metrics; profile-dependent review comparability |

Unknown statuses are surfaced through workflow diagnostics. Unsupported duration metrics return unavailable rather than borrowing another profile's semantics.

## Historical cache compatibility

Snapshot schema is version **5** and the dashboard cache schema is version **3** (the cached KPI shape changed: no `backflowCount` / `efficiencyIndex`, new `reworkedCycleCount` / `backflowEventCount`, and `excludeFromBackflow` replaces `excludeFromEfficiencyBackflow`). Pre-v5 derived flow snapshots are invalidated because their completion, First Pass, backflow, duration, and attribution meanings cannot be safely migrated. Historical flow is rebuilt from raw Jira history when available. Legacy scores remain comparable only inside the legacy parity report, not as a continuous V2 trend.
