# Metrio shared backend architecture

## Scope

Minimal API for **Metrio-owned collaborative data** only. External systems are fetched by the desktop client with existing integrations.

## Components

- **Desktop** — Tauri + React; Jira/Bamboo/Confluence/Google clients unchanged
- **Metrio API** (`backend/`) — Hono, SQLite, JWT auth
- **Local fallbacks** — `goals_data.json`, config cache, onboarding file when API unavailable

## API surface (v1)

| Route | Purpose |
|-------|---------|
| `GET /health` | Liveness |
| `POST /api/v1/auth/dev-session` | Dev-only session bootstrap |
| `GET /api/v1/access/me` | Server-computed scope |
| `GET/POST/PUT /api/v1/goals` | Shared goals + revision |
| `GET /api/v1/config/published` | Active company config |
| `POST /api/v1/config/publish` | Admin publish + version |
| `GET/PUT /api/v1/onboarding/instances/:employeeId` | Manual checklist state |

## Concurrency

Goals and onboarding instances use integer `revision` + `updatedAt`. `PUT` requires matching `If-Match` revision or returns **409 conflict**.

## Offline

Client keeps last successful read in local cache. Writes queue fail with `unavailable`; UI shows read-only or “temporarily unavailable”.
