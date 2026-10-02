# Phase 37 — Company-specific configuration audit

## Hardcoded / company-specific today

| Area | Location | Phase 37 action |
|------|----------|-----------------|
| Jira / Bamboo URLs | `src/config/company.ts`, `product.ts` | `CompanyConfig.integrations` + cache |
| Onboarding resources | `src/config/onboardingResources.ts` | `CompanyConfig.resources` (builtin default) |
| Onboarding checklist | `src/config/onboardingChecklistDefinitions.ts` | `CompanyConfig.onboarding.checklistItems` |
| Feedback templates | `domain/feedbackCycles/feedbackTemplates.ts` | `CompanyConfig.feedback.templates` |
| Operational defaults | `operationalRulesDefaults.ts` | `CompanyConfig.defaults` + managed fields |
| New starter 60d | `domain/onboarding/newStarter.ts` | `CompanyConfig.onboarding.newStarterDays` |
| Feedback onboarding days | checklist + scheduling | `CompanyConfig.onboarding.feedbackOnboardingDays` |
| Feature toggles | `featureGates.ts` (performance gate) | `CompanyConfig.features` + capabilities |
| Director org scope | Bamboo + `authorizedPeopleScope` | **Not** unlocked by local config alone |
| Updates | `config/updates.ts` | Unchanged (build channel) |

## Config source (v1)

- **Builtin default** — serialized from current Phase 26/36/35/31 behavior.
- **Local cache** — `company_config_cache.json` (Tauri app data), atomically validated on apply.
- **Optional remote** — `VITE_COMPANY_CONFIG_URL` (HTTPS); validated JSON; **no embedded tokens**; signature hook documented for future trusted server.

## Security boundary

Local / client-editable `CompanyConfig` **does not** grant organization scope or admin rights without matching **trusted** identity (explicit allowlist validated against signed-in user email/id). Director role and team scope remain from Bamboo resolution. See `docs/company-configuration.md`.
