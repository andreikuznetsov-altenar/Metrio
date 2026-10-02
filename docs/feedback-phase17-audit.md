# Feedback Phase 17 — production flow audit

Baseline: `origin/main` @ `85ed9858e89649802f1894d0f24767c9b073d1cc`.

## End-to-end flow

### 1. Page shell & team gate

| Step | Source | Action | Persistence | Failure | UI | Debt |
|------|--------|--------|-------------|---------|-----|------|
| Route → Feedback | App router | Render `FeedbackPage` | — | — | Main nav “Feedback” | — |
| Team mode | `FeedbackTeamProvider` / `teamDetection` | Block non-team users | Prefs unchanged | — | Empty copy (team leads only) | Old personal-mode wording |
| Init | `feedbackSurveyStore.init` | `loadSurveyData()` | Local survey file | Silent catch in sync | No skeleton | Single `loading` flag reused |

### 2. Google connection

| Step | Source | Action | Persistence | Failure | UI | Debt |
|------|--------|--------|-------------|---------|-----|------|
| Linked check | `prefs.google.accountEmail` | `hasGoogleAccount` | Prefs | — | Full-page connect card | Large card on every tab |
| OAuth connect | `connectGoogle` → `GoogleSurveyClient` | OAuth + status | Native secure storage + prefs patch | Raw / mapped via `formatGoogleOAuthError` | Connect button | — |
| Apps Script connect | Same entry with URL + secret | `connectAppsScriptGoogle` | Prefs URL (not secret in UI) | `formatAppsScriptError` | Manual drawer | Exposed to users when OAuth unavailable |
| Survey readiness | `prefs.google.formsConnected` | Gates tabs | Prefs flags | Partial connection | Inline status rows | Duplicate with strip need |
| Disconnect | `disconnectGoogle` + prefs clear | Clears account flags | Prefs | — | Confirm drawer | — |

**Transports (preserved):** `createSurveyGoogleClient` chooses native OAuth vs Apps Script from prefs; both remain.

### 3. Survey draft scope (UI state)

| Step | Source | Action | Persistence | Failure | UI | Debt |
|------|--------|--------|-------------|---------|-----|------|
| Initial dates | `prefs.reportFilters` | Local `useState` on mount | Not auto-synced after edit | — | Native `input type=date` | Not MetrioDatePicker |
| Scope / projects | Same prefs seed | Local state | Survey written on prepare | — | Comma-separated projects | Weak project UX |

### 4. Prepare survey

| Step | Source | Action | Persistence | Failure | UI | Debt |
|------|--------|--------|-------------|---------|-----|------|
| Validate | `validatePrepareSurvey` | Field issues | — | `prepareIssues` + banner | Concatenated banner | Should be field-level |
| Recipients | `discoverSurveyRecipients` (Jira + Bamboo) | Build recipient rows | In-memory → survey | Network / team errors | Drawer auto-open | — |
| Create survey | `createSurveyFromDefaults` | New survey record | `saveSurveyData` | — | — | — |
| Google Form | `ensureGoogleFormForSurvey` | Form + responder URI | Survey fields | Google API | Ready section | Form ID in UI |
| Store | `prepareSurvey` | Set active survey | Local file | `error` string | “Working…” banner | Broad loading |

### 5. Content & questions

| Step | Source | Action | Persistence | Failure | UI | Debt |
|------|--------|--------|-------------|---------|-----|------|
| Defaults vs active | `data.defaults` / active survey | Toggle edit mode | `saveDefaults` / `updateActiveSurvey` | Locked after send | Button labels | “Defaults” jargon |
| Questions | Survey types | CRUD + reorder | Persisted on survey | Validation on prepare | Checkbox “Active” | Not shared Switch |
| Icons | `Icon` fake letter | — | — | — | First letter only | Unacceptable |

### 6. Delivery & send

| Step | Source | Action | Persistence | Failure | UI | Debt |
|------|--------|--------|-------------|---------|-----|------|
| Eligibility | Recipient `status`, `selected`, email | Skip rules in batch loop | Per-recipient patch | Per-row `failed` | Delivery tab stats only | Send on Survey tab too |
| Confirm | `FeedbackSendConfirmDrawer` | User confirm | — | — | Technical field list | Copy polish |
| Batch | `sendSurveyBatch` | Sequential send | Batches + statuses | Partial failure | `sendSummary` banner | Should toast |
| Double-click | `loading` during send | Blocks re-entry | — | — | — | OK if button disabled |
| Test email | `sendTestEmail` | Single Gmail send | — | Error in store | Local message state | Should toast |
| Reminders | `sendReminders` + 24h interval | Filter `sent` only | Recipient reminder fields | Failed count in summary | Confirm drawer | — |

### 7. Response sync

| Step | Source | Action | Persistence | Failure | UI | Debt |
|------|--------|--------|-------------|---------|-----|------|
| Auto sync | `FeedbackPage` effect on `activeSurveyId` | `syncResponses` | `lastResponseSyncAt`, responses | Swallowed in effect | — | — |
| Manual | Sticky / Delivery refresh | Same API | Same | Store error | ISO timestamp in sticky | Not relative time |
| Mapping | `mapGoogleFormResponse`, merge | Privacy-preserving aggregate | Survey responses | — | Results tab | — |

### 8. Results & history

| Step | Source | Action | Persistence | Failure | UI | Debt |
|------|--------|--------|-------------|---------|-----|------|
| Metrics | `getSurveyMetrics` / `buildSurveyMetricsSummary` | KPI + question stats | From synced responses | Empty state | Custom tags | Not global Badge |
| History | `data.surveys` order | Click → set active | `setActiveSurvey` | — | Date-first rows | Empty copy |

### 9. Drawers

| Step | Source | Action | Persistence | Failure | UI | Debt |
|------|--------|--------|-------------|---------|-----|------|
| Recipients | `FeedbackRecipientsDrawer` | Search/filter/toggle | `updateRecipient` | — | Default drawer width | Too narrow for table |
| Confirms | Send / remind / regenerate | Confirm destructive ops | — | — | Default width | Should be notification size |

## UI layer map (pre–Phase 17)

- **Page:** `FeedbackPage.tsx` — tabs, Google panel, banners, sticky bar.
- **Design debt:** `design-system.tsx` + `feedback-ds.css` — banners, tags, fake `Icon`, native date, drawer footer pattern.
- **Store:** `feedbackSurveyStore.ts` — single `loading`, `sendSummary`, modal flags.
- **Services:** `recipientDiscovery`, `surveyFormService`, `surveyGoogleClient`, `googleSurveyClient`, `appsScriptSurveyClient`, `surveyPersistence`.

## Phase 17 remediation targets

1. Shared Metrio primitives (Button, Drawer sizes, Badge, Switch, MetrioDatePicker, PageSubnav, Toast, Skeleton).
2. Compact Google strip + focused onboarding; hide transport details from normal UI.
3. Toasts for transient outcomes; inline only for blocking errors / validation.
4. Survey IA: scope → content → questions → ready summary; Delivery owns send/remind.
5. Tests: workflow eligibility, send safety semantics, visual snapshots, mocked E2E fixture.
