# Phase 38 — Backend technology decision

## Options

| Option | Verdict |
|--------|---------|
| Mirror Jira/Bamboo in Postgres | **Rejected** — duplicate system of record |
| Supabase (managed Postgres + RLS) | **Future production candidate** — needs corporate approval & secrets |
| Full custom microservices | **Rejected** — scope creep |
| **Lightweight Node API + SQLite file** | **Chosen for v1 dev/CI** |

## Decision

Ship `backend/` as a **small Hono + SQLite** service:

- Single deployable unit, versioned `/api/v1/*`
- SQLite file in `backend/.data/` for local dev and integration tests
- **No production infrastructure provisioned** in this repo — operators supply `METRIO_API_JWT_SECRET`, HTTPS URL, and optional Postgres migration path documented in `docs/backend-architecture.md`

## Auth (v1)

- **Production**: corporate OIDC / JWT validation (documented; not wired without issuer config)
- **Dev/CI**: `METRIO_ALLOW_DEV_AUTH=1` + `METRIO_DEV_AUTH_SECRET` — issues short-lived JWTs; **identity and roles loaded server-side** from access tables, not from client body alone

## Why not client-only Supabase

Service role keys must not ship in the desktop app. A thin API keeps authorization logic server-side and avoids exposing RLS bypass credentials.
