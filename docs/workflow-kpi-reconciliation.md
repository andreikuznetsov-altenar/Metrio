# Workflow KPI reconciliation

Pass 8 maps Metrio workflow modules to legacy Google Apps Script reporters.

## Source locations

**Current canonical copies (vendored in Metrio):** `docs/canonical-legacy/apps-script/`

| Flow | Vendored canonical file | Historical provenance |
| --- | --- | --- |
| UX / corporate KPI | `docs/canonical-legacy/apps-script/Code.gs` | Former **Jira App** project `legacy/Code.gs` |
| WSkins KPI, cycles, workload | `docs/canonical-legacy/apps-script/WskinsAudit.gs` | Former **WSkins-v.2** Apps Script (`WskinsAudit.gs`, plain-text export) |

Parity tests read only repository-local paths (`appsScriptCanonicalParityPass136.test.ts`). External folders are not required for builds or CI.

## Legacy → Metrio modules

| Legacy function | Metrio |
| --- | --- |
| `calculateEfficiencyIndex_` | `src/domain/jira/kpi.ts` |
| `buildKpiFromIssues_` | `buildWorkflowKpi` + profile cycles |
| `buildWSkinsKpiFromIssues_` | `src/domain/workflows/wskinsKpi.ts` |
| `calculateWSkinsMainTaskKpiContribution_` | `calculateWskinsMainTaskKpiContribution` |
| `calculateWSkinsSubtaskKpiContribution_` | `calculateWskinsSubtaskKpiContribution` |
| `calculateWSkinsEfficiencyIndex_` | `src/domain/workflows/wskinsEfficiency.ts` |
| `normalizeWSkinsStatusForIssue_` (main On Hold → Internal Review) | `wskins_skin` status map (`On Hold` → `hold` with Internal Review semantics) |
| `getWSkinsIssueFlowModel_` | `profiles/wskinsSkin.ts`, `profiles/wskinsSubtask.ts` |
| `writeWSkinsTimeStatAutoSheet_` / UX time stat | `capacityWorkload.ts`, `workloadEngine.ts` |
| `isWSkinsReverseTransition_` | `profileCycles.ts` backflow ranks |

## WSkins efficiency formula parity

| Rule | Legacy | Metrio | Status |
| --- | --- | --- | --- |
| No started/review/completed activity | return **0** | return **0** | EXACT |
| Base score | 40 | 40 | EXACT |
| Completion denominator | `max(started, reviewSubmitted, 1)` | same | EXACT |
| Completion score | `min(45, round(rate × 45))`, no first-pass factor | same | EXACT |
| Speed when no duration samples | default **10** | default **10** | EXACT |
| Speed tiers vs `targetReviewDays` | 20 / 17 / 13 / 9 / 4 | same | EXACT |
| Backflow denominator | `max(started, 1)` | same | EXACT |
| Backflow penalty | `min(35, round(rate × 20))` | same | EXACT |
| Final clamp | `max(1, min(100, …))` | same | EXACT |
| First-pass in efficiency | not used | not used (`firstPassAcceptedCount` forced 0 in WSkins KPI) | EXACT |

## WSkins KPI contribution parity

| Behavior | Legacy | Metrio | Status |
| --- | --- | --- | --- |
| Main task started | first In Progress in period | same | EXACT |
| Main task review submitted | first In Progress → Internal Review in period | same | EXACT |
| Main task completed | same transition as completion | same | EXACT |
| Main task backflow in KPI | always 0 | same | EXACT |
| Subtask started | each In Progress in period | same | EXACT |
| Subtask review | In Progress → On approval | same | EXACT |
| Subtask completed | Done in period (once) | same | EXACT |
| Subtask backflow | status events with `isBackflow` in period | same (via issue events) | EXACT |

## WSkins workflow stages (Skin)

| Jira status | Canonical stage | Active work | Capacity | Attention |
| --- | --- | --- | --- | --- |
| Not started WS / To Do | backlog | no | no | no |
| In Progress | active | yes | yes | yes |
| Internal Review / On Hold (main) | hold | no | no | no |
| On approval / PRE-LIVE / Live / Archived | waiting | no | no | no |

Sub-task: To Do → backlog; In Progress → active; On approval → waiting; Done → done.

## Capacity load formula

Aligned with legacy workload helpers:

1. `daysInPeriod` = calendar difference `dateTo − dateFrom` **+ 1**
2. `monthlyQty = completedCycles / daysInPeriod × 30`
3. `estimatedMonthlyHours = monthlyQty × avgHoursPerCycle`
4. `capacityLoadPercent = estimatedMonthlyHours / 164 × 100`
5. Levels: **low** < 50, **normal** 50–85, **high** 85–100, **overloaded** > 100

Operational counts are reported separately; overload level follows `capacityLoadPercent`, not raw assigned count.

## Live read-only audit

```bash
npm run audit:workflow-capacity
```

Uses `METRIO_WORKFLOW_AUDIT=1` and prints workload before/after tables plus WS samples. Does not mutate Jira.

## Profile resolution order

1. Company `jiraWorkflowProfiles` + `DEFAULT_WORKFLOW_MAPPINGS`
2. `projectKey + issueType`
3. `projectKey`
4. `semanticClassifier.ts`
5. `simple` fallback

## Exclusions

Issue types **Epic**, **Provider**, and **Sprint Update** are excluded from workflow KPI and capacity (`eligibility.ts`).

## Intentional differences

| Area | Notes |
| --- | --- |
| Mixed UX + WSkins team efficiency | Metrio may weight per-profile efficiency when multiple models appear in one scope; pure WSkins scopes use `buildWskinsKpiFromIssues`. |
| Hold segments (UX) | UX hold segments still flow through `getCycleSegments`; WSkins KPI sets `holdCount: 0` like legacy WSkins sheet. |
