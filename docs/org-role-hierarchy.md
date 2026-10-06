# Organization role & hierarchy (Pass 12)

## Role definitions

Roles are derived **only** from the Bamboo reporting graph (supervisor links among active employees). Job titles, department names, and project membership **do not** determine product role.

| Org role | Definition |
|----------|------------|
| `individual_contributor` | Zero active direct reports |
| `leaf_manager` | One or more direct reports, and none of those reports manage others |
| `manager_of_managers` | At least one direct report who has their own direct reports |

## Graph source

- Primary: `supervisorEId` / `supervisorEmail` from Bamboo List Employees
- Fallback: company directory supervisor names (existing `orgResolver` behavior)
- Inactive/terminated employees are excluded from active relationships

## Scope semantics

| API | Semantics |
|-----|-----------|
| `resolveTeamScope` | **Unchanged** — self + immediate direct reports only |
| `resolveOrgHierarchyScope` | Recursive descendants, leadership branches, mixed direct ICs |
| `resolveAuthorizedPeopleScope` | Authorization for visible people (fail-closed on unresolved org) |

## Leadership branches

For `manager_of_managers`:

- **Visible summary rows** = first managerial layer below the current user (direct reports who are managers)
- **Metric scope per branch** = that manager plus their full recursive subtree
- Direct individual contributors under the current user are included in **overall** totals but not shown as peer leadership cards

## Aggregation rules

- Count unique entities (people, issue keys, goals) — no double counting across branches
- Recompute rates from underlying numerators/denominators; do not average team averages
- Capacity: use underlying person/cycle data; do not sum capacity percentages

## Feedback feature gates

| Role | Surveys / send / manage | Results |
|------|-------------------------|---------|
| IC | Hidden | Own permitted results only |
| Leaf manager | Full current team experience | Team results (unchanged) |
| Manager of managers | Hidden (tab hidden) | No executive response explorer in Pass 12 |

## Privacy

- Manager contact card: work email, job title, department, avatar only
- No personal phone/email/address in product surfaces

## Failure behavior

If hierarchy cannot be resolved (`unresolved`), the app uses the **narrowest** authorized scope (self / direct reports) and does not elevate permissions.

## Goals (Pass 12)

Branch-level goal aggregation for `manager_of_managers` is **not** enabled in Pass 12. Existing per-person goal authorization and privacy rules are unchanged. Do not roll up private individual goals across the org tree until a safe authorization model exists.

## Title-based logic audit

Product **scope and role gates** must not read `jobTitle` strings. Remaining `jobTitle` usage is display-only (headers, manager contact card, diagnostics-safe labels) or legacy `UserRole` presentation mapping where `orgRole` is unavailable (fail-closed to narrow scope).

`isDirectorRole` / `isManagerRole` remain compatibility helpers for presentation `UserRole` (`lead` / `director`) but primary routing uses `currentUser.orgRole` from the reporting graph.
