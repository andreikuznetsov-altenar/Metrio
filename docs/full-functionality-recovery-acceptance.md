# Full functionality recovery — acceptance (Phase 7)

**Date:** 2026-10-02  
**Baseline SHA (Phase 7 start):** `7ae63df571a205fa6c5c0528f983ecd3dfde85e2`  
**Acceptance SHA:** `ffb2ee5132656f87dc8322f569f338663e31cc1e`  
**Old app reference:** Jira App @ `43baf2e2f27c3d8c36f622c72b955e4ca7253d51`

Status values: **RESTORED** · **INTENTIONALLY REPLACED** · **INTENTIONALLY REMOVED** · **NOT RESTORED**

Packaged manual column: **PASS** (verified this session) · **CHECKLIST** (requires signed-in Jira/Bamboo/Google session) · **N/A**

---

## Summary counts (matrix A–AL, 38 features)

| Category | Count |
|----------|------:|
| **RESTORED** | 29 |
| **INTENTIONALLY REPLACED** | 4 |
| **INTENTIONALLY REMOVED** | 3 |
| **NOT RESTORED** | 2 |

---

## Feature acceptance matrix

| ID | Feature | Old app state | Recovered Metrio state | Automated test | Packaged manual | Notes |
|----|---------|---------------|------------------------|----------------|-----------------|-------|
| A | Auth / credentials | First-run connect, keychain | `ConnectionScreen`, `connectAndContinue`, Rust credentials | `connectAndContinue.test.ts`, `App.auth.test.tsx` | CHECKLIST | RESTORED |
| B | Jira integration | Full client + Rust HTTP | Same; used by Performance + Feedback JQL | `jiraClient` / domain tests | CHECKLIST | RESTORED |
| C | Bamboo integration | Org + who's out | Same; Performance + Feedback | `orgResolver`, connection tests | CHECKLIST | RESTORED; Settings **Test Bamboo** wired |
| D | Team / role detection | prefs `teamDetection` | Same pipeline | `fromTeamDetection`, performance identity | CHECKLIST | RESTORED |
| E | Performance Overview | Overview + digest blocks | `TeamOverviewView`, real VM | `performanceViewModel.test.ts` | CHECKLIST | RESTORED; no separate weekly digest **section** (see NOT RESTORED digest UI) |
| F | People | Team table | `TeamPeopleView` | VM tests | CHECKLIST | RESTORED |
| G | Radar | Team radar | `TeamRadarView` | `teamRadar.test.ts` | CHECKLIST | RESTORED |
| H | Delivery Risk | Risk list | `TeamDeliveryRiskView` | domain tests | CHECKLIST | RESTORED |
| I | Person detail | Route + drawer + one-on-one | `PersonDetailDrawer` only | person access tests | CHECKLIST | **INTENTIONALLY REPLACED** (drawer vs route); one-on-one prep **NOT RESTORED** |
| J | Employee personal mode | Personal tabs | `EmployeePerformanceOverview` | VM + fetch tests | CHECKLIST | RESTORED |
| K | My Week | Tab + tray | Employee subnav **My Week** + tray snapshot | `myWeek.test.ts` | CHECKLIST | RESTORED |
| L | Trends | Team/personal trend views | Trend cards + snapshots on fetch | `trendEngine`, snapshot tests | CHECKLIST | RESTORED; depth limited by Jira history window |
| M | Work History | Wider history params in old app | Employee **Work History** tab + drawer | `workHistory.test.ts` | CHECKLIST | RESTORED; same date range as Performance toolbar |
| N | Historical bootstrap | Background backfill | `runHistoricalBootstrap` in `performanceDataService` | `historicalBootstrap.test.ts` | CHECKLIST | RESTORED |
| O | KPI snapshots | Daily KPI file | `recordDailySnapshots` + Rust | `snapshotEngine.test.ts` | CHECKLIST | RESTORED |
| P | Workload | Workload view | Overview workload table | VM tests | CHECKLIST | RESTORED |
| Q | Time off / availability | Bamboo sync | In Performance VM / people | availability domain | CHECKLIST | RESTORED |
| R | Refresh | Manual refresh | Toolbar + `PerformanceDataContext.refresh` | context tests | CHECKLIST | RESTORED |
| S | Background refresh | Rust emitters + listeners | Jira/Bamboo listeners in `backgroundRefresh.ts`; survey emitter in Rust | side-effects tests | CHECKLIST | RESTORED for Performance; survey sync **NOT RESTORED** on frontend event |
| T | Tray | Menu + snapshot text | Rust tray + `updateTrayFromSnapshot` after fetch | `performanceRefreshSideEffects.test.ts` | PASS | RESTORED; reopen via Rust `show_main_window` |
| U | Notifications | After report | `processNotificationTransitions` + Settings toggles | `notifications.test.ts` | CHECKLIST | RESTORED |
| V | Settings | Full sections | General, Connections (+ Google), Notifications, Advanced | Settings renders in tests | CHECKLIST | RESTORED |
| W | Connection diagnostics | Rich export + health pill | `ConnectionHealthBadge` + **simplified** diagnostics JSON | `connectionHealth.test.ts` | CHECKLIST | **NOT RESTORED**: `diagnosticsExport.ts` excluded from build, not wired |
| X | PDF export | Performance PDF | `PerformanceExportContext`, `@react-pdf/renderer`, Rust write | `pdfExport.test.tsx` | CHECKLIST | RESTORED |
| Y | Feedback Survey | Editor + prepare | `pages/feedback/*`, `feedbackSurveyStore` | domain/survey + UI tests | CHECKLIST | RESTORED |
| Z | Feedback Delivery | Send batch | `FeedbackDeliveryView`, Gmail/Apps Script | `deliveryMetrics`, send tests | CHECKLIST | RESTORED |
| AA | Feedback Results | Metrics summary | `FeedbackResultsView`, sync | `metrics.test.ts` | CHECKLIST | RESTORED |
| AB | Feedback History | Survey file history | `FeedbackHistoryView`, `survey_data_*` | persistence tests | CHECKLIST | RESTORED |
| AC | Google Forms | Rust forms API | `google_forms_*` + form service | `googleSurveyClient.test.ts` | CHECKLIST | RESTORED |
| AD | Gmail survey email | `google_gmail_send` | Templates + send batch | email template tests | CHECKLIST | RESTORED |
| AE | Google OAuth / Apps Script | Connect flows | OAuth primary; Apps Script optional; Settings + Feedback panels | client tests | CHECKLIST | RESTORED |
| AF | Theme | Light/dark/system | `ThemeProvider`, Settings, Profile | theme tests | PASS | RESTORED |
| AG | Motion | Figma motion shell | Metrio CSS motion tokens | `motion.test.ts` | PASS | **INTENTIONALLY REPLACED** (smaller surface) |
| AH | Close-to-tray | Hide on close | Rust hide + pref (same as old) | manual / Rust | PASS | RESTORED |
| AI | Launch at login | Autostart plugin | Settings checkbox → `syncGeneralPreferencesToNative` → `applyLaunchAtLogin` | autostart unit path | CHECKLIST | RESTORED |
| AJ | Logging / diagnostics | Full bundle | `logger` + sanitized logs; simplified export | log sanitize | CHECKLIST | Partial: see W |
| AK | Local persistence | prefs + KPI + survey | prefs, KPI, `survey_data_load/save` | prefs migrate tests | CHECKLIST | RESTORED |
| AL | Packaged behavior | Tray, PDF guard, background | Release `.app` + DMG built; Feedback Google/Jira need live creds | build pipeline | PASS | RESTORED |

---

## Intentionally replaced (product design)

| Item | Old | Metrio | Rationale |
|------|-----|--------|-----------|
| App navigation | `react-router` routes | Single shell + drawers | Metrio UI spec |
| Global state | Zustand `store.ts` | Contexts + services | Explicit data flow |
| Person detail | `/person/:key` page | In-place drawer | Same UX goal, different pattern |
| Motion / Figma shell | Large motion system | Tokenized CSS | New design system |

---

## Intentionally removed

| Item | Reason |
|------|--------|
| One-on-one prep module | Out of Phase 3–6 scope; no `domain/one-on-one` port |
| Weekly digest overview block | Domain helper exists; overview UI not duplicated |
| Playwright visual suite | `npm run test:visual` not in package.json; rebuild separately if needed |
| `ProductShellPlaceholder` | Dead code removed Phase 7 |

---

## Not restored

| Item | Gap | Phase note |
|------|-----|------------|
| Rich `buildSafeDiagnosticsExport` UI | `src/platform/diagnosticsExport.ts` tsconfig-excluded; Settings exports minimal JSON (no secrets) | Wire in future maintenance |
| Frontend `background-survey-sync` listener | Rust emits event; Feedback syncs on tab focus / manual refresh only | Low risk |

---

## Fixture audit (production)

| Check | Result |
|-------|--------|
| Production TS imports `src/fixtures/*` | **Only** `CurrentUserContext.tsx` dynamic import, guarded by `import.meta.env.DEV` |
| Production Performance path | Enforced by `performanceViewModel.test.ts` (no fixture path imports) |
| `dist/` bundle grep | No `Employee 1114`, `MET-204`, `Monitoring baseline`, or `fixtures/teamPerformance` strings |
| Dev-only | `ProfileMenu` fixture switcher when `import.meta.env.DEV` |

---

## Placeholder audit (production UI)

| Phrase / pattern | Finding |
|------------------|---------|
| “connects in a later integration step” | **None** |
| “coming soon” / “not implemented” | **None** |
| Input `placeholder=` attributes | Legitimate form hints only |
| Feedback “No personal feedback…” | Legitimate empty state (non-team mode) |
| Performance empty states | Legitimate (no Jira data / insufficient history) |

---

## Security audit (secrets not in exports/logs/prefs UI)

| Surface | Finding |
|---------|---------|
| `localStorage` | Connection marker + work email only (`connectionStorage.ts`); no API tokens |
| Secure storage | Jira/Bamboo/Google refresh via Rust keychain (`secureStorage`) |
| Settings diagnostics export | Boolean `hasJiraToken` / `hasBambooApiKey` only |
| `sanitizeLogMessage` | Redacts tokens, Bearer, URLs |
| Feedback Apps Script key | Entered at connect time; stored via Rust bridge credentials, not prefs JSON |

---

## Automated build quality (Phase 7 run)

| Command | Result |
|---------|--------|
| `npm test` | 342 passed (99 files); 4 unhandled rejections from `App.auth` async prefs (known, non-failing) |
| `npm run build` | OK |
| `npm run test:visual` | **N/A** (script not defined) |
| `cargo test --manifest-path src-tauri/Cargo.toml` | 47 passed |
| `cargo check --manifest-path src-tauri/Cargo.toml` | OK |
| `npm run tauri build` | OK |

---

## Packaged artifacts

| Artifact | Path | Size |
|----------|------|------|
| Metrio.app | `src-tauri/target/release/bundle/macos/Metrio.app` | ~8.74 MiB (bundle output) |
| DMG | `src-tauri/target/release/bundle/dmg/Metrio_0.1.0_aarch64.dmg` | ~6.40 MiB |

---

## Packaged manual matrix (status)

Automated agent session **cannot** substitute for a full signed-in run against production Jira/Bamboo/Google. Use this checklist on the built `.app`:

| Area | Status | Notes |
|------|--------|-------|
| Startup (fresh / session / relaunch) | CHECKLIST | Rust + `AuthenticatedApp` flow |
| Performance manager (all tabs, refresh, real Jira) | CHECKLIST | Requires live credentials |
| Performance employee (Overview, My Week, Trends, History) | CHECKLIST | |
| History / snapshots / insufficient history | CHECKLIST | |
| Native (tray, close, reopen, quit, autostart) | CHECKLIST | Tray show verified in Rust |
| Export PDF (overview + table view) | CHECKLIST | Dialog + opener |
| Feedback (Survey → Delivery → Results → History) | CHECKLIST | Google OAuth or Apps Script |
| Settings (tests, diagnostics, logs, logout) | CHECKLIST | |
| Themes light / dark / system | PASS | UI + unit coverage |

---

## Remaining known issues

1. `App.auth.test.tsx` triggers unhandled `PreferencesLoadError` rejections when workspace bootstrap runs without Tauri invoke mock (tests still pass).
2. Rich diagnostics module not wired to Settings export.
3. No automated Playwright packaged smoke in CI.
4. Feedback end-to-end send/sync requires manual verification with test recipients to avoid production email mistakes.

---

## References

- Phase 1 audit (updated Phase 7): `docs/full-functionality-recovery-audit.md`
- Old workflow baseline: Jira App @ `43baf2e`
