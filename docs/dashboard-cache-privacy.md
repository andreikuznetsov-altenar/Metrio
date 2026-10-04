# Dashboard local cache (Pass 6D)

Metrio stores one JSON file in the macOS app data directory (`dashboard_cache.json`) so the Dashboard can render immediately on launch while Jira/Bamboo performance data refreshes in the background.

## Stored fields

| Field | Purpose |
|--------|---------|
| `schemaVersion` | Migration / invalidation on upgrade |
| `savedAt` | When the cache file was written (ISO) |
| `sourceLastUpdatedAt` | `lastUpdatedAt` from the successful performance fetch |
| `identity.selfPersonId` | Person id for the signed-in workspace |
| `identity.role` | User role at save time |
| `identity.datasetKey` | Date range, audience, review target, and person scope |
| `identity.workEmail` | Optional Bamboo work email for account scoping |
| `fetchResult` | Last successful `PerformanceFetchResult` snapshot (team persons, Jira audit aggregates, KPI snapshots, dependency index, time off, identity resolution metadata) |

## Not stored

- API tokens, passwords, or authorization headers
- Raw HTTP responses outside the normalized performance model
- Survey credentials or Google OAuth secrets

## Scoping

Cache entries are applied only when `selfPersonId`, `role`, and `datasetKey` match the active session. Mismatched or unknown schema versions are discarded without rendering.
