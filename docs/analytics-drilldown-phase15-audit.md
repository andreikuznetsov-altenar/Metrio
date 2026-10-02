# Analytics drill-down — Phase 15 audit (baseline `d72dc5b`)

## Metric evidence classification

| Metric | Unit in KPI cards | Source issues/events | Task-level in drill-down | Notes |
|--------|-------------------|----------------------|--------------------------|-------|
| **Completed** | Completed **cycle** in reporting window | `buildKpiFromIssues` → `isCompletedCycleInReportingPeriod` (`reviewToDone.endedAt`) | **A** — exact cycles | One issue may yield multiple rows (cycle index). |
| **First pass** | % = `firstPassAcceptedCount / completedCount` on same cycles | Cycle `isFirstPass` (= `!hasBackflow` on segment) | **A** — per completed cycle outcome | Numerator/denominator must match KPI counts. |
| **Backflows** (KPI card) | **Cycles** with `hasBackflow` | Same cycle builder | **A** — per backflow cycle + event list | Distinct from trend **event** counts (see below). |
| **Avg cycle** (trends card) | Weighted **issue** full cycle on completion day | Snapshots / `getIssueFullCycleMs` | **B** for KPI-card N/A; trend uses **issue/day** aggregates | Team overview has no Avg cycle summary KPI; drill-down from trends. |
| **Efficiency** | Composite index | `calculateEfficiencyIndex` on KPI totals | **C** for task-level attribution; **B** component breakdown | No per-task “−4% efficiency” claims. |

### Historical / trend snapshots

| Data | Classification | Drill-down behavior |
|------|----------------|---------------------|
| Live Jira `AuditIssue` + full `events` | **A** | Reconstruct cycles and daily buckets with same selectors as KPI. |
| `KpiSnapshotFile` daily buckets only | **C** aggregate | If issues unavailable: `detailLevel: "aggregate"` — show date + count, no fabricated rows. |

## Calculation paths (authoritative)

1. **Report:** `buildEnhancedJiraAuditReport` (`report.ts`) — issues grouped by `findMatchingTeamMembersForIssue` (historical Jira attribution, not current assignee alone).
2. **Team KPI:** `flattenGroupedIssues` (dedupe by `issueKey`, first preferred user wins) → `buildKpiFromIssues`.
3. **Cycles:** `getCycleSegments` on full `issue.events` → `buildCompletedCyclesFromSegments` → filter `isCompletedCycleInReportingPeriod`.
4. **Efficiency:** `calculateEfficiencyIndex` — completion 35 + first pass 35 + speed 30 − backflow penalty up to 20.
5. **Trend charts:** `teamSparklinePoints` / `teamFirstPassRateSparklinePoints` / `teamAvgCycleDaysSparklinePoints` — snapshot-weighted **daily** metrics (may differ from KPI card unit for backflows).

## Person display

Drill-down uses **report grouping key** (`grouped[userKey]`) for person name on team scope. `currentAssigneeCanonical` is not used for historical KPI attribution.

## Phase 15 architecture

- Shared collector: `collectReportingPeriodCycles` (same loop as `buildKpiFromIssues`).
- Evidence builder: `buildAnalyticsEvidence` — never a second KPI algorithm.
- Trend point click: filter cycles/events to bucket date when Jira data present; otherwise aggregate-only state.
