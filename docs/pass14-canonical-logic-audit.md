# PASS 14.1 canonical logic audit

## Canonical definitions and production authority

- **CURRENT OWNERSHIP** — one currently assigned Jira issue belongs to one
  canonical person. `domain/people/ownedIssues.ts` derives `ownedIssues` from
  current assignee identity and enforces uniqueness. `person.issues` remains the
  historical/analytical attribution set.
- **ACTIVE EXECUTION** — resolved stage has `countsAsActiveWork=true`.
  `domain/workflows/stagePresets.ts` and profile overrides define the flag;
  `domain/workload/workloadStatusClassification.ts` exposes the selector.
- **REVIEW** — resolved stage has `countsAsReview=true`; it is attention
  eligible but neither execution-active nor a capacity contributor.
- **QA** — a distinct `countsAsQa` flag. The safe generic/profile default is
  non-execution and non-capacity. A profile may override this only with verified
  workflow evidence.
- **HOLD** — `countsAsHold=true`, non-execution and non-capacity, normally
  attention eligible.
- **WAITING** — `countsAsWaiting=true`, non-execution and non-capacity.
- **CAPACITY CONTRIBUTOR** — resolved stage explicitly has
  `countsAsCapacityContributor=true`. Contributor intervals are accumulated by
  `domain/workflows/profileCycles.ts`; end-to-end cycle time is never substituted.
- **PERSONAL WORKLOAD** — unique currently owned issues, canonical current
  classification, contributor-cycle evidence, and configured thresholds.
  Authority: `domain/workload/workloadEngine.ts` and
  `domain/workflows/capacityWorkload.ts`.
- **TEAM WORKLOAD** — bottom-up average of direct organizational units.
  A direct IC contributes personal workload; a child manager contributes one
  recursively computed team value. Authority:
  `domain/workload/hierarchicalWorkload.ts`.
- **FIRST PASS** — a completed profile cycle with no qualifying profile-aware
  backflow. Authority: `domain/workflows/profileCycles.ts` and
  `domain/workflows/buildWorkflowKpi.ts`.
- **BACKFLOW** — a backwards canonical transition under the issue’s own profile,
  excluding configured/hold/backlog exceptions. Authority:
  `domain/workflows/profileCycles.ts`.
- **COMPLETION** — `isCompletion=true` after profile resolution. Cancellation is
  terminal but not successful completion. Authority:
  `domain/workflows/stagePresets.ts`,
  `domain/periods/issueCompletion.ts`.
- **UNKNOWN** — explicit safe stage: no active/review/QA/wait/hold/completion/
  capacity flags, raw status retained, `unmapped_status` diagnostic emitted by
  `domain/workflows/workflowDiagnostics.ts`.

Resolution precedence is implemented in
`domain/workflows/resolveWorkflowProfile.ts` and
`domain/workflows/resolveWorkflowStage.ts`: company project+type mapping,
project mapping, profile status mapping, safe semantic fallback, unknown.
Current and historical transitions resolve through the same issue profile.

## Workload and capacity findings

The mass-overload audit found three real defects:

1. `isIssueActive` treated QA, hold, and waiting as active.
2. Review/current non-execution stages could enter workload through broad
   operational checks.
3. Capacity used `fullCycleMs` whenever measured active time was zero, thereby
   converting review, hold, waiting, and queue time into execution hours.

Also repaired: unknown statuses silently becoming backlog, duplicate issue keys
within one person, default mappings winning over company mappings, and
profile-bypassing raw status checks in task health, radar, completion, historical
flow, project cockpit, linked goals, My Week, and cross-project dependencies.

Not present after audit: historical `person.issues` falling back into current
ownership, recursive percentage summing, team aggregate entering personal
workload, or current ownership assigned to multiple people. Those paths already
used `ownedIssues`, bottom-up unit averages, and uniqueness assertions.

Configured workload thresholds were not changed:

- low: `< 50%`
- normal: `50%–<85%`
- high: `85%–100%`
- overloaded: `>100%`

## Hierarchical semantics

- Leaf team: average of lead personal value plus each direct IC personal value.
- Parent with child managers: each child team is computed first and contributes
  exactly one unit.
- Mixed manager: direct ICs are personal units; child managers are team units.
- Deep hierarchy: recursion is depth-independent and guarded against cycles.
- Own-team member rows/donut: every visible person, including the lead, uses
  personal workload.
- Manager-unit view: a child manager represents the child team value.
- Percentages are averaged, never summed, and descendants are not flattened
  into a parent level.

## Cache compatibility

Dashboard cache schema 1 and KPI snapshot schemas below 4 contain derived
active/workload/flow values made under incompatible semantics. They are
invalidated. Raw Jira/Bamboo source data and unrelated preferences are retained.

## Consumer audit

| Consumer | Current ownership? | Historical attribution? | Canonical source | Workload semantic | Correct / repair |
|---|---:|---:|---|---|---|
| Dashboard | Y | KPI only | workload engine / workflow KPI | personal rows; explicit team units | repaired via shared models |
| My Focus | Y | N | operational selectors | personal | canonical selectors |
| Team Actions | Y | N | task health / radar | personal | canonical selectors |
| Attention Now | Y | N | task signals | personal | review/hold retained without active |
| Recommendations | Y | N | radar/task health | personal/team explicit | canonical inputs |
| Performance Overview | Y | Y | workload + workflow KPI | personal/team explicit | canonical inputs |
| Team Attention | Y | N | team radar | personal | operational, not active-only |
| Team Workload | Y | N | workload engine | explicit personal/team unit | already bottom-up |
| People | Y | KPI only | person service | personal | `ownedIssues` enforced |
| Radar | Y | N | task signals | personal | repaired |
| Delivery Risk | Y | N | delivery risk | personal | review/hold retained |
| Person drawer | Y | Y | person service | personal | correct |
| Person Brief | Y | Y | person brief models | personal | shared canonical inputs |
| My Week | Y | Y for completed | canonical workflow selectors | personal | repaired active/review split |
| Notifications | Y | N | workload/radar snapshot | personal | cache invalidated |
| Tray summary | Y | KPI only | canonical view models | personal/team explicit | shared canonical inputs |
| Team Brief / digest | Y | KPI only | donut/workload units | context-explicit | correct |
| Goals linked work | current stage | Y | workflow resolver | personal attribution | raw checks removed |
| Project cockpit | Y | Y | workflow resolver / task health | project aggregate | completion repaired |
| Dependencies | Y | N | each linked issue’s own profile | n/a | cross-project inheritance removed |
| Historical snapshots | N | Y | workflow KPI / workload output | stored derived values | schema invalidated |

Display-only badge/color checks remain display-only; they do not determine
ownership, canonical stages, workload, capacity, completion, or KPI.

## Legacy boundary

Repository-canonical references are
`docs/canonical-legacy/apps-script/Code.gs` and `WskinsAudit.gs`.
Legacy defines workflow KPI, first pass/backflow, cycle durations, efficiency,
per-user/team KPI, and its time-stat workload calculation. It does not define
Metrio’s recursive organizational-unit workload; that is a new product rule and
is tested separately.
