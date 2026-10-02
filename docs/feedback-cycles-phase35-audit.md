# Phase 35 — Feedback cycles audit

## Current stack (preserved)

| Area | Location | Notes |
|------|----------|--------|
| Persistence | `survey_data.json` via `survey_data_load/save` | Schema v1 → **v2** adds cycles/templates |
| State | `feedbackSurveyStore.ts` (Zustand) | Prepare, send, sync, reminders |
| Google OAuth | `prefs.google`, `GoogleConnectionPanel` | Forms + Gmail flags |
| Apps Script bridge | `appsScriptSurveyClient.ts` | Optional web app URL |
| Forms API | `googleSurveyClient.ts`, `surveyFormService.ts` | Create/publish form |
| Recipients | `recipientDiscovery.ts`, Jira/Bamboo scope | `full` vs `direct` only |
| Delivery | `sendSurveyBatch`, Gmail via native | Batches in `sendBatches` |
| Results | `responses.ts`, `FeedbackResultsView` | Sync from Google |
| History | `FeedbackHistoryView` | Past surveys list |
| UI tabs | Survey / Delivery / Results / History | Unchanged flow for active run |
| Background | Rust `background-survey-sync` every 15m | Frontend sync on demand today |

## Phase 35 additions

- **FeedbackCycle** — recurring program definition (cadence, audience, template).
- **FeedbackRun** — implemented as existing **`Survey`** row + `cycleId`, `periodKey`, `dueAt`.
- **Templates** — `FeedbackSurveyTemplate` library with stable `questionKey` per question.
- **Scheduler** — `evaluateFeedbackCycles()` on survey data load + performance refresh (no React timer).
- **Migration** — legacy surveys → one-off runs (`cycleId: null` or auto `custom` cycle wrapper).

## Confidentiality (display rules)

- Default: **identified** (email per recipient; Google verified responder collection as configured).
- Template may set `confidentiality: anonymous_aggregated` — UI shows anonymity limits; **no claim of anonymity** when `emailCollectionMode === VERIFIED`.
- Aggregated team views: minimum **3** responses before showing grouped anonymous results (`MIN_ANONYMOUS_GROUP_SIZE`).

## Recipient scope

- Recipient generation uses **direct** team scope by default for cycles; never auto-expands to `fullTeam` / indirect reports.

## Not in scope

- Sentiment scoring on comments.
- Replacing Google Forms / Apps Script.
- Org-wide blast without explicit rule.
