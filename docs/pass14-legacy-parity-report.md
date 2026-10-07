# PASS 14.4 Legacy parity report

Executable harness: `src/domain/parity/pass14LegacyParity.test.ts`.

Legacy oracle is a test-only verbatim port of:

- `docs/canonical-legacy/apps-script/Code.gs` (`buildKpiFromIssues_`, `getCycleSegments_`, `calculateEfficiencyIndex_`)
- `docs/canonical-legacy/apps-script/WskinsAudit.gs` (`buildWSkinsKpiFromIssues_`, main/subtask contributions, `calculateWSkinsEfficiencyIndex_`)

Production Metrio is **not** used as the legacy reference.

UX Apps Script date-filters changelog via `rangeEvents`. Metrio product KPI uses full history and keeps cycles whose `completedAt` falls in the inclusive `dateFrom`/`dateTo` window. Fixtures feed the GS oracle range-truncated events so period semantics are comparable.

Workload / capacity is **not** a GS Time Stat port. Those rows are tagged `PRODUCT_RULE` against PASS 14.1 canonical rules.

Generated rows: 380. Unexplained mismatches: 0.

## Metric rollup

| Metric | MATCH | INTENTIONAL | PRODUCT_RULE | MISMATCH |
| --- | ---: | ---: | ---: | ---: |
| startedCount | 35 | 0 | 0 | 0 |
| completedCount | 35 | 0 | 0 | 0 |
| reviewSubmittedCount | 35 | 0 | 0 | 0 |
| firstPassAcceptedCount | 35 | 0 | 0 | 0 |
| backflowCount | 35 | 0 | 0 | 0 |
| holdCount | 35 | 0 | 0 | 0 |
| avgProgressToReviewMs | 33 | 2 | 0 | 0 |
| avgReviewToDoneMs | 33 | 2 | 0 | 0 |
| avgTodoToApprovedMs | 35 | 0 | 0 | 0 |
| efficiencyIndex | 33 | 2 | 0 | 0 |
| activeWorkCount | 0 | 0 | 15 | 0 |
| capacityLoadPercent | 0 | 0 | 15 | 0 |

## Fixture detail

| Fixture | Metric | Legacy | Metrio | Verdict | Reason | Source legacy | Source Metrio |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1-todo-ip-review-done | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 1-todo-ip-review-done | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 1-todo-ip-review-done | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 1-todo-ip-review-done | firstPassAcceptedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 1-todo-ip-review-done | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 1-todo-ip-review-done | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 1-todo-ip-review-done | avgProgressToReviewMs | 259199997 | 259199997 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 1-todo-ip-review-done | avgReviewToDoneMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 1-todo-ip-review-done | avgTodoToApprovedMs | 431999995 | 431999995 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 1-todo-ip-review-done | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 2-ip-review-ip-review-done | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 2-ip-review-ip-review-done | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 2-ip-review-ip-review-done | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 2-ip-review-ip-review-done | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 2-ip-review-ip-review-done | backflowCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 2-ip-review-ip-review-done | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 2-ip-review-ip-review-done | avgProgressToReviewMs | 259199997 | 431999995 | INTENTIONAL | GS uses first Review entry; Metrio profile cycles use last Review entry. Count metrics remain the GS completed-cycle model. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 2-ip-review-ip-review-done | avgReviewToDoneMs | 259199997 | 86399999 | INTENTIONAL | GS uses first Review entry; Metrio profile cycles use last Review entry. Count metrics remain the GS completed-cycle model. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 2-ip-review-ip-review-done | avgTodoToApprovedMs | 518399994 | 518399994 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 2-ip-review-ip-review-done | efficiencyIndex | 45 | 33 | INTENTIONAL | GS uses first Review entry; Metrio profile cycles use last Review entry. Count metrics remain the GS completed-cycle model. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 3-long-review | startedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 3-long-review | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 3-long-review | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 3-long-review | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 3-long-review | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 3-long-review | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 3-long-review | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 3-long-review | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 3-long-review | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 3-long-review | efficiencyIndex | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 4-hold | startedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 4-hold | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 4-hold | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 4-hold | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 4-hold | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 4-hold | holdCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 4-hold | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 4-hold | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 4-hold | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 4-hold | efficiencyIndex | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 5-waiting | startedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 5-waiting | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 5-waiting | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 5-waiting | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 5-waiting | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 5-waiting | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 5-waiting | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 5-waiting | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 5-waiting | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 5-waiting | efficiencyIndex | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 6-cancelled | startedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 6-cancelled | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 6-cancelled | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 6-cancelled | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 6-cancelled | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 6-cancelled | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 6-cancelled | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 6-cancelled | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 6-cancelled | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 6-cancelled | efficiencyIndex | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 7-reassignment | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 7-reassignment | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 7-reassignment | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 7-reassignment | firstPassAcceptedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 7-reassignment | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 7-reassignment | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 7-reassignment | avgProgressToReviewMs | 259199997 | 259199997 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 7-reassignment | avgReviewToDoneMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 7-reassignment | avgTodoToApprovedMs | 431999995 | 431999995 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 7-reassignment | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 8-multiple-cycles | startedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 8-multiple-cycles | completedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 8-multiple-cycles | reviewSubmittedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 8-multiple-cycles | firstPassAcceptedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 8-multiple-cycles | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 8-multiple-cycles | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 8-multiple-cycles | avgProgressToReviewMs | 84599999 | 84599999 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 8-multiple-cycles | avgReviewToDoneMs | 86399999 | 86399999 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 8-multiple-cycles | avgTodoToApprovedMs | 170999998 | 170999998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 8-multiple-cycles | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 9-first-pass | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 9-first-pass | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 9-first-pass | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 9-first-pass | firstPassAcceptedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 9-first-pass | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 9-first-pass | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 9-first-pass | avgProgressToReviewMs | 259199997 | 259199997 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 9-first-pass | avgReviewToDoneMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 9-first-pass | avgTodoToApprovedMs | 431999995 | 431999995 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 9-first-pass | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 10-backflow | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 10-backflow | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 10-backflow | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 10-backflow | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 10-backflow | backflowCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 10-backflow | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 10-backflow | avgProgressToReviewMs | 259199997 | 431999995 | INTENTIONAL | GS uses first Review entry; Metrio profile cycles use last Review entry. Count metrics remain the GS completed-cycle model. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 10-backflow | avgReviewToDoneMs | 259199997 | 86399999 | INTENTIONAL | GS uses first Review entry; Metrio profile cycles use last Review entry. Count metrics remain the GS completed-cycle model. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 10-backflow | avgTodoToApprovedMs | 518399994 | 518399994 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 10-backflow | efficiencyIndex | 45 | 33 | INTENTIONAL | GS uses first Review entry; Metrio profile cycles use last Review entry. Count metrics remain the GS completed-cycle model. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 11-no-completion-in-period | startedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 11-no-completion-in-period | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 11-no-completion-in-period | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 11-no-completion-in-period | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 11-no-completion-in-period | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 11-no-completion-in-period | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 11-no-completion-in-period | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 11-no-completion-in-period | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 11-no-completion-in-period | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 11-no-completion-in-period | efficiencyIndex | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 12-boundary | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 12-boundary | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 12-boundary | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 12-boundary | firstPassAcceptedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 12-boundary | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 12-boundary | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 12-boundary | avgProgressToReviewMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 12-boundary | avgReviewToDoneMs | 140399998 | 140399998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 12-boundary | avgTodoToApprovedMs | 313199996 | 313199996 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 12-boundary | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 13-7d | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 13-7d | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 13-7d | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 13-7d | firstPassAcceptedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 13-7d | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 13-7d | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 13-7d | avgProgressToReviewMs | 86399999 | 86399999 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 13-7d | avgReviewToDoneMs | 21600000 | 21600000 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 13-7d | avgTodoToApprovedMs | 107999999 | 107999999 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 13-7d | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 14-30d | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 14-30d | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 14-30d | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 14-30d | firstPassAcceptedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 14-30d | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 14-30d | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 14-30d | avgProgressToReviewMs | 259199997 | 259199997 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 14-30d | avgReviewToDoneMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 14-30d | avgTodoToApprovedMs | 431999995 | 431999995 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 14-30d | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 15-3m | startedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 15-3m | completedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 15-3m | reviewSubmittedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 15-3m | firstPassAcceptedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 15-3m | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 15-3m | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 15-3m | avgProgressToReviewMs | 215999998 | 215999998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 15-3m | avgReviewToDoneMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 15-3m | avgTodoToApprovedMs | 388799996 | 388799996 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 15-3m | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 16-6m | startedCount | 3 | 3 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 16-6m | completedCount | 3 | 3 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 16-6m | reviewSubmittedCount | 3 | 3 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 16-6m | firstPassAcceptedCount | 3 | 3 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 16-6m | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 16-6m | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 16-6m | avgProgressToReviewMs | 201599998 | 201599998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 16-6m | avgReviewToDoneMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 16-6m | avgTodoToApprovedMs | 374399996 | 374399996 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| 16-6m | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ / getCycleSegments_` | `buildKpiFromIssues → buildWorkflowKpi / extractProfileContributorCycles` |
| ws-1-happy | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-1-happy | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-1-happy | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-1-happy | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-1-happy | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-1-happy | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-1-happy | avgProgressToReviewMs | 259199997 | 259199997 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-1-happy | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-1-happy | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-1-happy | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-1-happy/product | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-1-happy/product | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-1-happy/product | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-1-happy/product | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-1-happy/product | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-1-happy/product | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-1-happy/product | avgProgressToReviewMs | 259199997 | 259199997 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-1-happy/product | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-1-happy/product | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-1-happy/product | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-2-backflow | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-2-backflow | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-2-backflow | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-2-backflow | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-2-backflow | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-2-backflow | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-2-backflow | avgProgressToReviewMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-2-backflow | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-2-backflow | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-2-backflow | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-2-backflow/product | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-2-backflow/product | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-2-backflow/product | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-2-backflow/product | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-2-backflow/product | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-2-backflow/product | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-2-backflow/product | avgProgressToReviewMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-2-backflow/product | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-2-backflow/product | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-2-backflow/product | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-3-long-progress | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-3-long-progress | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-3-long-progress | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-3-long-progress | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-3-long-progress | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-3-long-progress | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-3-long-progress | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-3-long-progress | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-3-long-progress | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-3-long-progress | efficiencyIndex | 50 | 50 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-3-long-progress/product | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-3-long-progress/product | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-3-long-progress/product | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-3-long-progress/product | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-3-long-progress/product | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-3-long-progress/product | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-3-long-progress/product | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-3-long-progress/product | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-3-long-progress/product | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-3-long-progress/product | efficiencyIndex | 50 | 50 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-4-hold | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-4-hold | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-4-hold | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-4-hold | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-4-hold | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-4-hold | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-4-hold | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-4-hold | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-4-hold | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-4-hold | efficiencyIndex | 50 | 50 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-4-hold/product | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-4-hold/product | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-4-hold/product | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-4-hold/product | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-4-hold/product | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-4-hold/product | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-4-hold/product | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-4-hold/product | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-4-hold/product | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-4-hold/product | efficiencyIndex | 50 | 50 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-6-cancelled | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-6-cancelled | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-6-cancelled | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-6-cancelled | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-6-cancelled | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-6-cancelled | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-6-cancelled | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-6-cancelled | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-6-cancelled | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-6-cancelled | efficiencyIndex | 50 | 50 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-6-cancelled/product | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-6-cancelled/product | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-6-cancelled/product | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-6-cancelled/product | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-6-cancelled/product | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-6-cancelled/product | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-6-cancelled/product | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-6-cancelled/product | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-6-cancelled/product | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-6-cancelled/product | efficiencyIndex | 50 | 50 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-11-no-completion | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-11-no-completion | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-11-no-completion | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-11-no-completion | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-11-no-completion | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-11-no-completion | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-11-no-completion | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-11-no-completion | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-11-no-completion | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-11-no-completion | efficiencyIndex | 50 | 50 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-11-no-completion/product | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-11-no-completion/product | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-11-no-completion/product | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-11-no-completion/product | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-11-no-completion/product | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-11-no-completion/product | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-11-no-completion/product | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-11-no-completion/product | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-11-no-completion/product | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-11-no-completion/product | efficiencyIndex | 50 | 50 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-12-boundary | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-12-boundary | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-12-boundary | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-12-boundary | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-12-boundary | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-12-boundary | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-12-boundary | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-12-boundary | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-12-boundary | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-12-boundary | efficiencyIndex | 50 | 50 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-12-boundary/product | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-12-boundary/product | completedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-12-boundary/product | reviewSubmittedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-12-boundary/product | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-12-boundary/product | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-12-boundary/product | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-12-boundary/product | avgProgressToReviewMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-12-boundary/product | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-12-boundary/product | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-12-boundary/product | efficiencyIndex | 50 | 50 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-subtask-backflow | startedCount | 2 | 2 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-subtask-backflow | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-subtask-backflow | reviewSubmittedCount | 2 | 2 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-subtask-backflow | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-subtask-backflow | backflowCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-subtask-backflow | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-subtask-backflow | avgProgressToReviewMs | 129599999 | 129599999 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-subtask-backflow | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-subtask-backflow | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-subtask-backflow | efficiencyIndex | 73 | 73 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `wskinsKpi.ts buildWskinsKpiFromIssues` |
| ws-subtask-backflow/product | startedCount | 2 | 2 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-subtask-backflow/product | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-subtask-backflow/product | reviewSubmittedCount | 2 | 2 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-subtask-backflow/product | firstPassAcceptedCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-subtask-backflow/product | backflowCount | 1 | 1 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-subtask-backflow/product | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-subtask-backflow/product | avgProgressToReviewMs | 129599999 | 129599999 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-subtask-backflow/product | avgReviewToDoneMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-subtask-backflow/product | avgTodoToApprovedMs | null | null | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| ws-subtask-backflow/product | efficiencyIndex | 73 | 73 | MATCH | Identical on the same fixture. | `WskinsAudit.gs buildWSkinsKpiFromIssues_` | `buildKpiFromIssues → buildWorkflowKpi (wskins branch)` |
| per-user-alice | startedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-alice | completedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-alice | reviewSubmittedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-alice | firstPassAcceptedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-alice | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-alice | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-alice | avgProgressToReviewMs | 259199997 | 259199997 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-alice | avgReviewToDoneMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-alice | avgTodoToApprovedMs | 431999995 | 431999995 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-alice | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-bob | startedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-bob | completedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-bob | reviewSubmittedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-bob | firstPassAcceptedCount | 1 | 1 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-bob | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-bob | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-bob | avgProgressToReviewMs | 259199997 | 259199997 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-bob | avgReviewToDoneMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-bob | avgTodoToApprovedMs | 431999995 | 431999995 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| per-user-bob | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs buildKpiFromIssues_ (user block)` | `buildKpiFromIssues (user issues)` |
| team-kpi-unique-keys | startedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs flattenGroupedIssues_ + buildKpiFromIssues_` | `unique issueKey flatten + buildKpiFromIssues` |
| team-kpi-unique-keys | completedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs flattenGroupedIssues_ + buildKpiFromIssues_` | `unique issueKey flatten + buildKpiFromIssues` |
| team-kpi-unique-keys | reviewSubmittedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs flattenGroupedIssues_ + buildKpiFromIssues_` | `unique issueKey flatten + buildKpiFromIssues` |
| team-kpi-unique-keys | firstPassAcceptedCount | 2 | 2 | MATCH | Identical on the same fixture. | `Code.gs flattenGroupedIssues_ + buildKpiFromIssues_` | `unique issueKey flatten + buildKpiFromIssues` |
| team-kpi-unique-keys | backflowCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs flattenGroupedIssues_ + buildKpiFromIssues_` | `unique issueKey flatten + buildKpiFromIssues` |
| team-kpi-unique-keys | holdCount | 0 | 0 | MATCH | Identical on the same fixture. | `Code.gs flattenGroupedIssues_ + buildKpiFromIssues_` | `unique issueKey flatten + buildKpiFromIssues` |
| team-kpi-unique-keys | avgProgressToReviewMs | 259199997 | 259199997 | MATCH | Identical on the same fixture. | `Code.gs flattenGroupedIssues_ + buildKpiFromIssues_` | `unique issueKey flatten + buildKpiFromIssues` |
| team-kpi-unique-keys | avgReviewToDoneMs | 172799998 | 172799998 | MATCH | Identical on the same fixture. | `Code.gs flattenGroupedIssues_ + buildKpiFromIssues_` | `unique issueKey flatten + buildKpiFromIssues` |
| team-kpi-unique-keys | avgTodoToApprovedMs | 431999995 | 431999995 | MATCH | Identical on the same fixture. | `Code.gs flattenGroupedIssues_ + buildKpiFromIssues_` | `unique issueKey flatten + buildKpiFromIssues` |
| team-kpi-unique-keys | efficiencyIndex | 100 | 100 | MATCH | Identical on the same fixture. | `Code.gs flattenGroupedIssues_ + buildKpiFromIssues_` | `unique issueKey flatten + buildKpiFromIssues` |
| 1-todo-ip-review-done | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 1-todo-ip-review-done | capacityLoadPercent | n/a | 43.9 | PRODUCT_RULE | capacityDataState=measured; level=low. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| 2-ip-review-ip-review-done | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 2-ip-review-ip-review-done | capacityLoadPercent | n/a | 58.5 | PRODUCT_RULE | capacityDataState=measured; level=normal. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| 3-long-review | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 3-long-review | capacityLoadPercent | n/a | 0 | PRODUCT_RULE | capacityDataState=insufficient_history; level=normal. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| 4-hold | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 4-hold | capacityLoadPercent | n/a | 0 | PRODUCT_RULE | capacityDataState=insufficient_history; level=normal. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| 5-waiting | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 5-waiting | capacityLoadPercent | n/a | 0 | PRODUCT_RULE | capacityDataState=insufficient_history; level=normal. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| 6-cancelled | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 6-cancelled | capacityLoadPercent | n/a | 0 | PRODUCT_RULE | capacityDataState=insufficient_history; level=normal. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| 7-reassignment | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 7-reassignment | capacityLoadPercent | n/a | 43.9 | PRODUCT_RULE | capacityDataState=measured; level=low. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| 8-multiple-cycles | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 8-multiple-cycles | capacityLoadPercent | n/a | 28.7 | PRODUCT_RULE | capacityDataState=measured; level=low. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| 9-first-pass | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 9-first-pass | capacityLoadPercent | n/a | 43.9 | PRODUCT_RULE | capacityDataState=measured; level=low. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| 10-backflow | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 10-backflow | capacityLoadPercent | n/a | 58.5 | PRODUCT_RULE | capacityDataState=measured; level=normal. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| 11-no-completion-in-period | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| 11-no-completion-in-period | capacityLoadPercent | n/a | 0 | PRODUCT_RULE | capacityDataState=insufficient_history; level=normal. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| ws-1-happy | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| ws-1-happy | capacityLoadPercent | n/a | 43.9 | PRODUCT_RULE | capacityDataState=measured; level=low. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| ws-3-long-progress | activeWorkCount | n/a (Time Stat is not this model) | 1 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| ws-3-long-progress | capacityLoadPercent | n/a | 0 | PRODUCT_RULE | capacityDataState=insufficient_history; level=normal. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| ws-4-hold | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| ws-4-hold | capacityLoadPercent | n/a | 29.3 | PRODUCT_RULE | capacityDataState=measured; level=low. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |
| ws-6-cancelled | activeWorkCount | n/a (Time Stat is not this model) | 0 | PRODUCT_RULE | Review/QA/hold/waiting excluded from activeWorkCount and capacity (PASS 14.1). Not a GS Time Stat port. | `n/a — writeWSkinsTimeStatAutoSheet_ / UX time stat not used` | `capacityWorkload.countOperationalWorkload / calculateWorkload` |
| ws-6-cancelled | capacityLoadPercent | n/a | 0 | PRODUCT_RULE | capacityDataState=insufficient_history; level=normal. Overloaded only when load > 100. | `n/a` | `calculateCapacityBreakdown` |

## Cycle engine

Production `getCycleSegments` is compared to `getCycleSegments_` on the same full event list (not truncated). A mismatch there is a port defect.

## Intentional product KPI differences

| Area | Why |
| --- | --- |
| Backflow progress→review / review→done | GS keeps the first Review entry; Metrio profile cycles measure to the last Review entry before Done. Counts (completed/backflow/first-pass) still follow GS. |
| Mixed UX+WSkins team efficiency | Weighted per-profile efficiency. Pure UX fixtures use `calculateEfficiencyIndex`. |
| Capacity / workload | PASS 14.1 product rules: Review/QA/hold/waiting are not Active and not capacity. Monthly load uses in-period activeCapacityMs only; pre-period In Progress is not annualized. Legacy Time Stat used progress→review minutes and 3-tier load. |

