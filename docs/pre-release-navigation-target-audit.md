# Pre-release navigation target audit

Scope: Phases 21–41 visible actions. Production curated resources must not use guessed Atlassian paths.

## Resource resolution (post-fix)

| Source | Renders when | Target |
|--------|----------------|--------|
| `CURATED_ONBOARDING_RESOURCES` | Audience match + resolvable target | Bamboo portal, Jira project URL from configured base |
| CompanyConfig resources | Admin URL present | Explicit `external` URL |
| Confluence API links | `explicit_link` / high confidence + URL | Page URL |
| Visual fixture catalog | `VITE_VISUAL_FIXTURE=1` only | `example.test` URLs in `onboardingResourcesVisual.ts` |

Removed from production: `HANDBOOK`, `DESIGN`, `ENG`, `OFFICE/pages/malta` style paths.

## Internal routes (verified patterns)

| Action | Expected destination |
|--------|---------------------|
| View all · My Week | Performance → employee `my-week` |
| Delivery Risk | Performance tab `delivery-risk` |
| View goals | Performance goals / employee goals |
| Open Feedback | `feedback` route (hidden when `feedbackEnabled` false) |
| Team overview | Performance tab `overview` |
| Notification Open Jira | External browse URL for issue key |
| Command palette Go to Feedback | Same gate as header |

## Dead link policy
- Do not render curated external links without `http` URL.
- Jira project rows require `jiraBaseUrl` or project `jiraUrl`.
- Bamboo curated entries label honestly (`Open BambooHR`).

## Tests to add/extend
- Navigation integration: resource click URL, Jira row `/browse/KEY`, internal `dispatch*` routes.
- `matchOnboardingResources.test.ts` updated for production catalog.

## Open follow-ups
- Full click-through QA in signed build (§98).
- Person Brief / dependency / project cockpit deep links — manual pass.
