# Company configuration

## Purpose

`CompanyConfig` centralizes company-specific Metrio behavior (resources, onboarding checklists, feedback templates, operational defaults, feature flags) without editing source code.

## Sources (priority)

1. **Validated local cache** — `company_config_cache.json` (Tauri app data).
2. **Builtin default** — `buildDefaultCompanyConfig()` (current Altenar / Phase 26–36 behavior).
3. **Optional remote** — `VITE_COMPANY_CONFIG_URL` (HTTPS JSON only). Invalid payloads are rejected; last good cache remains active.

Credentials **never** belong in CompanyConfig. Use the secure credential store.

## Security boundary

- **Client config is not authorization.** `accessPolicy.organizationScopeAllowlist` and `companyAdmins` are explicit lists used only to match the signed-in user’s email / Bamboo id.
- **Director / team scope** still comes from Bamboo resolution and existing Metrio access rules.
- Sensitive org-wide data must be gated by a **trusted backend** in production — not by a locally edited JSON file alone.

## Admin

- Admin is **not** inferred from `jobTitle`.
- Admin requires `accessPolicy.companyAdmins.emails` or `employeeIds` match.

## Managed settings

`defaults.managedFields` uses:

- `managed` — company value, read-only in Settings.
- `user-overridable` — company default, user may change in Attention rules.
- `user-only` — not set in v1 defaults.

`EffectiveConfig` merges company defaults with user preferences accordingly.

## Feature flags

`features.*` removes UI entry points when disabled. Stored domain data (goals, surveys) is not deleted.

## Offline

If remote fetch fails, Metrio keeps the last validated cache and surfaces `lastRemoteError` to admins.

## Rollback

Config history stores version metadata locally. Full rollback to prior JSON requires a trusted admin backend in multi-user deployments; local history is audit metadata in v1.
