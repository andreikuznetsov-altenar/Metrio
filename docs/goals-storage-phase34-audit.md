# Phase 34 — Goals storage architecture

## Requirement

Goals are **human-defined expectations** that must be visible to both manager and employee when agreed. Metrio today is a **single-user desktop install** with local app data (`preferences.json`, `survey_data.json`, KPI snapshots).

## Options evaluated

| Option | Verdict |
|--------|---------|
| A. Local `goals_data.json` only | **Implemented (v1)** — same pattern as surveys/KPI snapshots. |
| B. Jira issues as goal storage | Rejected — pollutes Jira; not explicit product choice. |
| C. Confluence pages as database | Rejected — not structured, no access control. |
| D. New company HTTP API | **Future** — correct long-term for cross-device manager ↔ employee sync. |

## v1 decision (no fake sharing)

**Local-first goals file** on this installation: `goals_data.json` in the Tauri app data directory.

- Goals created here are **real records** for this Metrio workspace (this machine + this signed-in user context).
- They are **not** automatically replicated to another employee’s laptop until a shared backend exists.
- UI and permissions still model manager ↔ direct report relationships using **team snapshot** data so behavior matches production once storage is shared.
- Documentation and About copy must not claim cross-user cloud sync.

## Schema

- `GoalsDataFile`: `schemaVersion`, `goals[]`, `history[]`
- Atomic read/write via Rust `goals_data_load` / `goals_data_save` (mirrors `survey_store`).

## Migration path to shared backend

1. Keep domain types stable (`Goal` in `src/domain/goals/`).
2. Replace `goalsPersistence.ts` transport with API client; optional import/export from local file.
3. Add `syncVersion` / `updatedAt` conflict handling.
4. Do not store performance scores or rankings in either layer.

## Privacy

- Access enforced in `goalAccess.ts` (self, direct reports, team scope for authorized managers).
- No org-wide goal directory by default.
