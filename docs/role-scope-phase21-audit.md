# Role scope audit (Phase 21)

## How `director` is assigned

- **Production path:** Bamboo org resolution + `fromTeamDetection` maps job titles containing “director” to the `director` **presentation role** on `CurrentUser`.
- **Development:** Profile menu fixture `Director fixture (4 reports)` switches the dev user without changing Bamboo.

## Authorization today

| Rule | Implementation |
|------|----------------|
| Visible people | `resolveTeamScope()` — self, or self + **immediate direct reports** only |
| `fullTeam` from Bamboo | Computed in org resolution but **not** exposed in UI or Performance fetch scope |
| Indirect reports | Explicitly excluded via `findIndirectReportsExcludedFromScope()` tests |
| Job title | **Must not** grant access; only `resolveTeamScope` / existing role model |

## Director in Phase 21–22

- **Organization actions** reuse the **same dataset and member list** as team managers until Security approves broader scope.
- No automatic expansion to `fullTeam`.
- Phase 22 adds `AuthorizedPeopleScope` (`self` / `direct_reports` / `organization`) with **organization** only when `VITE_ORGANIZATION_SCOPE_PERSON_IDS` lists explicit Bamboo person ids.
- `jobTitle` / director presentation role does **not** grant organization scope.
- Pending product/security decision documented here; do not enable indirect-report Performance without an explicit scope change.

## Bamboo fields used

Operational only: display name, job title (display), supervisor/reporting, availability, time off, work status — no new HR fields in Phase 21.
