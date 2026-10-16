# Current Workload Model V2

Current workload answers: “How much work is this person reasonably expected to perform in the next 10 working days, relative to their available working capacity?” It is independent of historical capacity, task-health penalties, and delivery-risk severity.

## Assignee-effort matrix

Every raw Jira status is first resolved by its workflow profile. The profile then assigns the current assignee one of five effort modes. Strict corporate profiles map unknown statuses to `none` so a new Jira state cannot silently create workload.

| Canonical stage | Default mode | Current-workload treatment |
| --- | --- | --- |
| backlog | `queued` | estimated effort × probability of starting inside the horizon |
| active | `hands_on` | estimated remaining effort |
| review | `reserve` | probability of backflow × median rework effort |
| QA | `external_wait` | zero direct QA effort; expected backflow reserve only |
| waiting | `external_wait` | zero |
| hold | `external_wait` | zero |
| done / cancelled / unknown | `none` | excluded or zero |

Profile-specific ownership decisions:

| Workflow/profile | Hands-on | Reserve | External wait / completion |
| --- | --- | --- | --- |
| UX, AGTC, AIVA, classic/design review | In Progress, Need to Fix, Draft | Review, In Review, Design Review | Pending, On Hold; terminal states are none |
| WS Skin | In Progress | — | Internal Review is completion semantics; On approval, PRE-LIVE, Live are external wait; Done/Archive are none |
| WS Sub-task | In Progress | — | On approval is external wait; Done is none |
| AGP development | In Progress | Code Review | QA, QA Done, Merged on Develop, Blocked |
| ADF dev / QA / release | Development, In Development, In Progress | Code Review, Review | QA, QA IN PROGRESS, Quality Assurance, Testing, Release Candidate, Blocked |
| PRD phased | Issue Approved, Analysis, Tech Analysis | Review | Ready for BA Handover, handed-over/ready states, QA/acceptance/release |
| PRD discovery / handover | Analysis, high-fidelity UX, decomposition, development | Analysis Completed, Handover | Issue Approved, Handover Completed, waiting/support and QA |
| PRD task | Analysis | Review | terminal states are none |
| ARCH governance | In Progress | Request for Comments, In Review | review-start and approval requests, holds |
| CRC editorial | Translation, Writing, Update needed | Editing, Proofreading | Queue, Ready to Publish, On Hold |
| CIT delivery | In Progress | — | Suspended, On Hold, Deployed on UAT |
| CIT purchase | In Progress | — | Awaiting approval, Order Placed |
| CIT security patch | Investigating, Applying Patch | — | Ready for Scan, Postponed |

The executable matrix is covered by `src/domain/workflows/assigneeEffortMatrix.test.ts`.

## Effort estimation

Structured Jira remaining/original time estimates take priority. Without them, completed hands-on business-hour durations use medians and the narrowest bucket with at least five samples:

1. person + workflow profile + issue type
2. team/board + workflow profile + issue type
3. organization + workflow profile + issue type
4. workflow profile
5. 12-hour conservative global fallback

Hands-on work uses remaining rather than total effort, conditional on elapsed active business time where at least three comparable completions remain. Review and QA reserve use observed backflow probability and median post-backflow hands-on duration. Queued work uses due date plus observed start-within-horizon behavior. Board volume adapters are explicit extension points; no number is parsed from issue-summary text.

Available capacity is 8 hours for each of the next 10 Monday–Friday days, less overlapping known leave. Team workload is `sum(expected effort) / sum(available hours)`, recursively, rather than an average of child-team percentages.
