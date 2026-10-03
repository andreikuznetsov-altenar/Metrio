# Local Metrio API development

## Start API

```bash
cd backend
npm install
METRIO_ALLOW_DEV_AUTH=1 METRIO_DEV_AUTH_SECRET=dev-local-secret METRIO_API_JWT_SECRET=dev-jwt-secret npm run dev
```

Default: `http://127.0.0.1:8787`

## Desktop client

```bash
VITE_METRIO_API_URL=http://127.0.0.1:8787 VITE_METRIO_DEV_AUTH_SECRET=dev-local-secret npm run dev
```

Settings → Connections → **Metrio Cloud** → Connect (dev).

## Seed users

| Bamboo id | Role | Direct reports |
|-----------|------|----------------|
| `person-alex` | employee | — |
| `person-sam` | lead | person-alex, person-01 |
| `person-jordan` | director | org scope if in `access_org_viewers` |

## Tests

```bash
npm run test:backend
```

Uses in-memory DB — no production credentials.
