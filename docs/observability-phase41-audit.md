# Phase 41 — Observability audit

## Existing assets (pre–Phase 41)

| Area | Location | Notes |
|------|----------|--------|
| File logging | `src-tauri/src/logs.rs` | `app.log`, 2MB rotate, URL/token redaction |
| Frontend logger | `src/platform/logger.ts` | `writeLog(level, domain, operation, message, correlationId?)` |
| Boot stages | `src/app/bootDiagnostics.ts` | `bootLog(step, detail)` |
| Setup logs | `write_setup_log` (Rust) | Native boot |
| Safe JSON export | `src/platform/diagnosticsExport.ts` | No secrets; not yet a full bundle |
| Sync metadata | `preferences.sync` | `lastJiraSync`, `lastBambooSync`, stale flags |
| Connection tests | `src/platform/connectionTest.ts` | Jira/Bamboo lightweight |
| Log sanitize | `src/platform/logSanitize.ts` | URLs, Bearer tokens |
| Security docs | `docs/backend-security.md` | Trust boundaries |

## Phase 41 additions

- Structured `recordAppLog` records (component, event, result, duration, error category).
- In-memory **integration health** + **refresh metrics** + **API session counters**.
- **Settings → Diagnostics** (simple + advanced).
- **Support bundle ZIP** with redaction + secret-leak tests.
- **No remote telemetry** in this phase.

## Privacy

- No issue titles, Confluence bodies, or feedback responses in default bundle.
- Emails hashed; paths normalized; credentials never exported.
