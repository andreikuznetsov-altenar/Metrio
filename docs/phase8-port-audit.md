# Phase 8 — port audit (Jira App → Metrio)

Old project (read-only): `/Users/andreikuznetsov/Documents/11. Altenar/Jira App`

Classification: **domain** = product rules; **platform** = host/OS/Tauri; **UI-coupled** = depends on old React/layout (not ported as-is).

| Module (old) | Class | Metrio path | Notes |
|--------------|-------|-------------|--------|
| `domain/jira/*` (kpi, firstPass, cycles, report, jql) | domain | `src/domain/jira/` | KPI formulas unchanged; backflow via `cycles` |
| `domain/history/*`, `services/history/*` | domain | same | Historical bootstrap |
| `domain/snapshots/*`, `services/snapshots/*` | domain | same | KPI snapshot file engine |
| `services/jira/jiraClient.ts` | platform | `src/services/jira/` | Tauri invoke to Rust Jira API |
| `services/bamboo/*` | platform | `src/services/bamboo/` | Org resolution + **teamScope** (non-recursive) |
| `platform/secureStorage`, `logger`, `logSanitize` | platform | `src/platform/` | Keychain via Rust |
| `platform/tray.ts` | platform | `src/platform/tray.ts` | Tray lines; deadlock fix in Rust |
| `services/export/buildPerformanceExportData`, `pdfNormalize` | domain | `src/services/export/` | `personDisplay` extracted to `domain/people/` |
| `services/refresh/backgroundRefresh.ts` | platform | new | Listens to Rust `background-*` events |
| `src-tauri` Jira/Bamboo/credentials/PDF/snapshots/logs/tray | platform | `src-tauri/src/` | Google/Apps Script/survey **not** ported |
| Old React UI, CSS, AIVA, shadcn, fixtures UI | UI | — | **Excluded** |

## Role rule (new)

After Bamboo hierarchy load, **`resolveTeamScope`** (`src/services/bamboo/teamScope.ts`):

- **Employee**: self only  
- **Lead/director**: self + **immediate** direct reports  
- **`fullTeam` from org resolver is never used for visibility** (recursive tree remains internal/diagnostic only)

Tests: `teamScope.test.ts`, existing `orgResolver.test.ts`, `domain/jira/kpi.test.ts`.

## Tray deadlock fix

Ported from old `lib.rs`: `read_tray_menu_snapshot` clones tray text **without** holding the lock during AppKit menu rebuild; `refresh_tray_menu` + `update_tray_snapshot` split. Rust unit tests: `tray_lock_tests`.
