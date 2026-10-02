# Jira due date audit (Phase 24)

## Finding

Normalized `AuditIssue` (see `src/domain/jira/types.ts`) and the current Jira fetch field set **do not include** `duedate` / `dueDate`.

Performance reporting and person work rows therefore **cannot** show “due during time off” without a separate API/field expansion.

## Phase 24 behavior

- UI **does not** infer deadline conflicts.
- Employee pre-leave block omits “Due during time off” until due dates are added to the ingestion pipeline.

## Future enablement

1. Add `dueDate?: string` (ISO date) to `AuditIssue` when building from Jira `fields.duedate`.
2. Gate UI with `hasJiraDueDateSupport(issues)` helper.
