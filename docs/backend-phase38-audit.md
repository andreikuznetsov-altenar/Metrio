# Phase 38 — Data storage audit

| Data | Location | Class | Notes |
|------|----------|-------|-------|
| Jira/Bamboo credentials | Tauri secure store | **E** | Never in backend DB |
| `preferences.json` | App data | **A** | UI, thresholds, notification toggles |
| Notification events | localStorage | **A** | Device-local read state (v1) |
| Jira assignment baseline | preferences | **A/D** | Device notification dedupe |
| `survey_data.json` | App data | **B** | Google owns responses; Metrio run metadata |
| KPI snapshots | App data | **D** | Derived cache from Jira |
| Work graph / Confluence links | Memory + session cache | **D** | Fetched with user token |
| Bamboo/team snapshot | Memory per refresh | **D** | Authoritative in Bamboo |
| `goals_data.json` | App data | **C** → cloud | Shared in Phase 38 |
| `company_config_cache.json` | App data | **C** → cloud | Published config shared |
| Onboarding manual state | App data | **C** → cloud | `OnboardingInstance` |
| Phase 37 draft config | Local cache only | **C** | Drafts on server for admins |
| Company admin allowlist (sensitive) | Was local config | **C** | **Server** `access` tables |
| Digest state | preferences | **A** | |
| Operational rules user overrides | preferences | **A** | Company defaults from config |

## Ownership

- **Jira** — work items  
- **Confluence** — documentation  
- **BambooHR** — HR, people, time off  
- **Google** — Forms / Gmail artifacts  
- **Metrio backend** — goals, published company config, onboarding instances, org authorization, audit log
