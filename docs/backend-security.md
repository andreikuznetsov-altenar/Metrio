# Metrio backend security

## Trust boundaries

- **Never trust** client-sent `role`, `jobTitle`, or organization scope flags for authorization.
- **JWT** carries `sub` (Bamboo employee id) and `email` only; permissions resolved from server DB on each request.
- **CompanyConfig** organization allowlists on the client are **not** a security boundary — `access_org_viewers` table on server.

## Secrets

| Secret | Location |
|--------|----------|
| `METRIO_API_JWT_SECRET` | API server env only |
| `METRIO_DEV_AUTH_SECRET` | Dev API + dev desktop build only |
| DB credentials | Server only (SQLite path local; Postgres in prod) |
| Jira/Bamboo/Google tokens | Desktop secure store only |

## Transport

HTTPS in production. Dev may use `http://127.0.0.1` for local API.

## Audit

Mutations log `actor_id`, `action`, `entity`, `at` — no secret or HR payload fields.

## Tests required

- User A cannot read user B goals
- Manager cannot read indirect reports
- Forged JWT / wrong secret rejected
- Client role tampering does not expand API access

## Support bundle (Phase 41)

Desktop **Export support bundle** produces a local ZIP with:

- `build-info.json`, `diagnostics.json`, `integration-status.json`, `preferences-safe.json`, `recent-logs.json`

Redaction rules:

- No API tokens, OAuth refresh/access tokens, or keychain values
- Work emails hashed (`email_h…`); home paths normalized to `[user]`
- No Jira issue titles, Confluence page bodies, or feedback responses by default
- Automated `supportBundle.secretLeak.test.ts` asserts forbidden secret strings never appear in bundle text

No automatic upload — user must share the file explicitly with support.
