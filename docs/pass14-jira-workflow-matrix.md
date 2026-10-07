# PASS 14.1 corporate Jira workflow matrix

Source of truth: `defaultWorkflowMappings.ts`, registered workflow profiles,
and read-only Jira `/project/{key}/statuses` metadata captured 2026-10-07.
Every status exposed by Jira metadata is explicitly present in its resolved
profile; the live audit fails if a metadata status falls through inference.

Flags are resolved-profile semantics before issue eligibility: E execution-active,
R review, Q QA, W waiting, H hold, C successful completion, X cancellation,
Cap capacity contributor, Attn attention eligible. Eligibility exclusions win
after resolution.
Rows group statuses only when their canonical semantics are identical.

| Project | Issue type / workflow | Profile | Raw Jira status | Stage | E | R | Q | W | H | C | X | Cap | Attn | Source | Jira verified | Notes |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| UX | Design Improvement | design_review | TODO / To Do | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | |
| UX | Design Improvement | design_review | Draft / In Progress / Need to Fix | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | Draft verified from historical changelog |
| UX | Design Improvement | design_review | In Review | review | N | Y | N | N | N | N | N | N | Y | project+type | Y | |
| UX | Design Improvement | design_review | Pending | waiting | N | N | N | Y | N | N | N | N | N | project+type | Y | Historical pre-review queue |
| UX | Design Improvement | design_review | On Hold | hold | N | N | N | N | Y | N | N | N | Y | project+type | Y | |
| UX | Design Improvement | design_review | Done | done | N | N | N | N | N | Y | N | N | N | project+type | Y | |
| UX | Design Improvement | design_review | Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project+type | Y | |
| UX | Design Task / Epic / Sub-task | ux | TODO | backlog | N | N | N | N | N | N | N | N | N | project | Y | |
| UX | Design Task / Sub-task | ux | Draft / In Progress / Need to Fix | active | Y | N | N | N | N | N | N | Y | Y | project | Y | Draft verified from historical changelog |
| UX | Design Task / Epic / Sub-task | ux | In Review | review | N | Y | N | N | N | N | N | N | Y | project | Y | |
| UX | Design Task / Epic / Sub-task | ux | Pending | waiting | N | N | N | Y | N | N | N | N | N | project | Y | Historical pre-review queue |
| UX | Design Task / Epic / Sub-task | ux | On Hold | hold | N | N | N | N | Y | N | N | N | Y | project | Y | |
| UX | Design Task / Epic / Sub-task | ux | Done | done | N | N | N | N | N | Y | N | N | N | project | Y | |
| UX | Design Task / Epic / Sub-task | ux | Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project | Y | |
| WS | Skin | wskins_skin | Not started WS | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | |
| WS | Skin | wskins_skin | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| WS | Skin | wskins_skin | Internal Review | hold | N | N | N | N | Y | Y | N | N | N | project+type | Y | Legacy WSkins completion point |
| WS | Skin | wskins_skin | On approval / PRE-LIVE / Live / Archived | waiting | N | N | N | N* | N | N | N | N | N | project+type | Y | Downstream override suppresses operational waiting flag |
| WS | Sub-task | wskins_subtask | To Do | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | |
| WS | Sub-task | wskins_subtask | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| WS | Sub-task | wskins_subtask | On approval | waiting | N | N | N | Y | N | N | N | N | N | project+type | Y | |
| WS | Sub-task | wskins_subtask | Done | done | N | N | N | N | N | Y | N | N | N | project+type | Y | Same label differs from WS Skin |
| WS | Sprint Update | excluded | To Do / In Progress / Done | excluded | N | N | N | N | N | N | N | N | N | eligibility exclusion | Y | Excluded issue type |
| AGTC | Task | design_review | To Do | backlog | N | N | N | N | N | N | N | N | N | project | Y | |
| AGTC | Task | design_review | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project | Y | |
| AGTC | Task | design_review | In Review | review | N | Y | N | N | N | N | N | N | Y | project | Y | |
| AGTC | Task | design_review | On Hold | hold | N | N | N | N | Y | N | N | N | Y | project | Y | |
| AGTC | Task | design_review | Done | done | N | N | N | N | N | Y | N | N | N | project | Y | |
| AGTC | Task | design_review | Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project | Y | |
| AGTC | Provider | agtc_provider | Provider / To Do | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | Provider is excluded from workload/KPI eligibility |
| AGTC | Provider | agtc_provider | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| AGTC | Provider | agtc_provider | In Review | review | N | Y | N | N | N | N | N | N | Y | project+type | Y | |
| AGTC | Provider | agtc_provider | On Hold | hold | N | N | N | N | Y | N | N | N | Y | project+type | Y | |
| AGTC | Provider | agtc_provider | Done | done | N | N | N | N | N | Y | N | N | N | project+type | Y | |
| AGTC | Provider | agtc_provider | Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project+type | Y | |
| AIVA | all metadata issue types | design_review | To Do | backlog | N | N | N | N | N | N | N | N | N | project | Y | |
| AIVA | all metadata issue types | design_review | In Progress / Need to fix | active | Y | N | N | N | N | N | N | Y | Y | project | Y | |
| AIVA | all metadata issue types | design_review | Under review | review | N | Y | N | N | N | N | N | N | Y | project | Y | |
| AIVA | all metadata issue types | design_review | On hold | hold | N | N | N | N | Y | N | N | N | Y | project | Y | |
| AIVA | all metadata issue types | design_review | Done | done | N | N | N | N | N | Y | N | N | N | project | Y | |
| AIVA | all metadata issue types | design_review | Cancel | cancelled | N | N | N | N | N | N | Y | N | N | project | Y | |
| AGP | Bug / Improvement / Task / Sub-task / Epic | classic_review | TODO / To Do / New / Testing on Stage | backlog | N | N | N | N | N | N | N | N | N | project | Y | Testing on Stage is Jira category new |
| AGP | same | classic_review | In Progress / Need to Fix | active | Y | N | N | N | N | N | N | Y | Y | project | Y | |
| AGP | same | classic_review | In Review | review | N | Y | N | N | N | N | N | N | Y | project | Y | |
| AGP | same | classic_review | Ready for test / Tested on Stage | qa | N | N | Y | N | N | N | N | N | Y | project | Y | |
| AGP | same | classic_review | Ready for Release | waiting | N | N | N | Y | N | N | N | N | N | project | Y | |
| AGP | same | classic_review | On Hold | hold | N | N | N | N | Y | N | N | N | Y | project | Y | |
| AGP | same | classic_review | Done / Released | done | N | N | N | N | N | Y | N | N | N | project | Y | |
| AGP | same | classic_review | Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project | Y | |
| AGP | Story | agp_development | New / Picked for Development / Postponed | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | |
| AGP | Story | agp_development | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| AGP | Story | agp_development | Code Review | review | N | Y | N | N | N | N | N | N | Y | project+type | Y | |
| AGP | Story | agp_development | QA | qa | N | N | Y | N | N | N | N | N | Y | project+type | Y | |
| AGP | Story | agp_development | Merged on Develop / QA Done | waiting | N | N | N | Y | N | N | N | N | N | project+type | Y | |
| AGP | Story | agp_development | Blocked | hold | N | N | N | N | Y | N | N | N | Y | project+type | Y | |
| AGP | Story | agp_development | Closed | done | N | N | N | N | N | Y | N | N | N | project+type | Y | |
| AGP | Dev Internals | agp_internal | Under discussion | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | |
| AGP | Dev Internals | agp_internal | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| AGP | Dev Internals | agp_internal | Done | done | N | N | N | N | N | Y | N | N | N | project+type | Y | |
| AGP | Dev Internals | agp_internal | Declined | cancelled | N | N | N | N | N | N | Y | N | N | project+type | Y | |
| ADF | Arch Review / Bug / Epic / Story / Subtask / Supertask / Task | dev_qa_release | To Do | backlog | N | N | N | N | N | N | N | N | N | project | Y | |
| ADF | same | dev_qa_release | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project | Y | |
| ADF | same | dev_qa_release | Code Review | review | N | Y | N | N | N | N | N | N | Y | project | Y | |
| ADF | same | dev_qa_release | QA IN PROGRESS / Quality Assurance | qa | N | N | Y | N | N | N | N | N | Y | project | Y | |
| ADF | same | dev_qa_release | Release Candidate | waiting | N | N | N | Y | N | N | N | N | N | project | Y | |
| ADF | same | dev_qa_release | Blocked / QA on hold | hold | N | N | N | N | Y | N | N | N | Y | project | Y | |
| ADF | same | dev_qa_release | Done | done | N | N | N | N | N | Y | N | N | N | project | Y | |
| ADF | same | dev_qa_release | Rejected | cancelled | N | N | N | N | N | N | Y | N | N | project | Y | Jira category done, unsuccessful terminal |
| ADF | Incident | adf_incident | To Do | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | |
| ADF | Incident | adf_incident | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| ADF | Incident | adf_incident | Waiting for User Story | waiting | N | N | N | Y | N | N | N | N | N | project+type | Y | |
| ADF | Incident | adf_incident | Done | done | N | N | N | N | N | Y | N | N | N | project+type | Y | |
| ADF | Incident | adf_incident | Rejected | cancelled | N | N | N | N | N | N | Y | N | N | project+type | Y | |
| PRD | Direct Request / Epic / Story | prd_phased | Request/Idea / Open / 1. Open / A. Open / M. Backlog | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | Historical aliases verified from changelog |
| PRD | same | prd_phased | B. Issue Approved / C. Analysis / G. Tech Analysis | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| PRD | same | prd_phased | D. Review / E. Ready For BA Handover | review | N | Y | N | N | N | N | N | N | Y | project+type | Y | |
| PRD | same | prd_phased | I. Rollout/QA / J. Acceptance Testing | qa | N | N | Y | N | N | N | N | N | Y | project+type | Y | |
| PRD | same | prd_phased | F. Handed Over to BA / H. Ready for Development / K. Ready for Release | waiting | N | N | N | Y | N | N | N | N | N | project+type | Y | |
| PRD | same | prd_phased | L. Completed | done | N | N | N | N | N | Y | N | N | N | project+type | Y | |
| PRD | same | prd_phased | L. Cancelled / M. Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project+type | Y | Historical renamed status included |
| PRD | Improvement / New Feature | prd_discovery | Request/Idea / Postponed | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | |
| PRD | same | prd_discovery | Analysis / Business Analysis / High Fidelity UX / Technical Decomposition / In development | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| PRD | same | prd_discovery | Analysis Completed / Issue Approved / Handover | review | N | Y | N | N | N | N | N | N | Y | project+type | Y | |
| PRD | same | prd_discovery | Rollout/QA | qa | N | N | Y | N | N | N | N | N | Y | project+type | Y | |
| PRD | same | prd_discovery | Handover Completed | waiting | N | N | N | Y | N | N | N | N | N | project+type | Y | |
| PRD | same | prd_discovery | Completed | done | N | N | N | N | N | Y | N | N | N | project+type | Y | |
| PRD | same | prd_discovery | Discarded | cancelled | N | N | N | N | N | N | Y | N | N | project+type | Y | |
| PRD | Task / Sub-task | prd_task | Open | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | |
| PRD | Task / Sub-task | prd_task | Analysis | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| PRD | Task / Sub-task | prd_task | Review | review | N | Y | N | N | N | N | N | N | Y | project+type | Y | |
| PRD | Task / Sub-task | prd_task | Completed | done | N | N | N | N | N | Y | N | N | N | project+type | Y | |
| PRD | Task / Sub-task | prd_task | Not Required / Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project+type | Y | |
| ARCH | Epic / Task / Sub-task | governance | Backlog | backlog | N | N | N | N | N | N | N | N | N | project | Y | |
| ARCH | Epic / Task / Sub-task | governance | Paused / Suspended | hold | N | N | N | N | Y | N | N | N | Y | project | Y | |
| ARCH | same | governance | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project | Y | |
| ARCH | same | governance | Request to start review / Request for Comments / Request for Approval | review | N | Y | N | N | N | N | N | N | Y | project | Y | |
| ARCH | same | governance | Done / Process Exception: Concluded de facto | done | N | N | N | N | N | Y | N | N | N | project | Y | |
| ARCH | same | governance | Rejected / Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project | Y | |
| CRC | Task / Sub-task | editorial | Backlog / New | backlog | N | N | N | N | N | N | N | N | N | project | Y | |
| CRC | Task / Sub-task | editorial | Translation / Writing / Update needed | active | Y | N | N | N | N | N | N | Y | Y | project | Y | |
| CRC | Task / Sub-task | editorial | Proofreading | review | N | Y | N | N | N | N | N | N | Y | project | Y | |
| CRC | Task / Sub-task | editorial | Queue | waiting | N | N | N | Y | N | N | N | N | N | project | Y | |
| CRC | Task / Sub-task | editorial | Publish | done | N | N | N | N | N | Y | N | N | N | project | Y | |
| CIT | Epic / Problem / Story / Task / Sub-task / System Change | cit_delivery | Backlog | backlog | N | N | N | N | N | N | N | N | N | project | Y | |
| CIT | same | cit_delivery | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project | Y | |
| CIT | same | cit_delivery | Deployed on UAT | qa | N | N | Y | N | N | N | N | N | Y | project | Y | |
| CIT | same | cit_delivery | Suspended / On Hold | hold | N | N | N | N | Y | N | N | N | Y | project | Y | |
| CIT | same | cit_delivery | Ongoing / Deployed to Production / Done | done | N | N | N | N | N | Y | N | N | N | project | Y | `Ongoing` is Jira category done |
| CIT | same | cit_delivery | Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project | Y | |
| CIT | Purchase Request | cit_purchase | Open | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | |
| CIT | Purchase Request | cit_purchase | In Progress | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| CIT | Purchase Request | cit_purchase | Awaiting approval | review | N | Y | N | N | N | N | N | N | Y | project+type | Y | |
| CIT | Purchase Request | cit_purchase | Order Placed | waiting | N | N | N | Y | N | N | N | N | N | project+type | Y | |
| CIT | Purchase Request | cit_purchase | Delivered | done | N | N | N | N | N | Y | N | N | N | project+type | Y | |
| CIT | Purchase Request | cit_purchase | Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project+type | Y | |
| CIT | Security Patch | cit_security_patch | Backlog / Postponed | backlog | N | N | N | N | N | N | N | N | N | project+type | Y | |
| CIT | Security Patch | cit_security_patch | Investigating / Applying Patch | active | Y | N | N | N | N | N | N | Y | Y | project+type | Y | |
| CIT | Security Patch | cit_security_patch | Ready for Scan | qa | N | N | Y | N | N | N | N | N | Y | project+type | Y | |
| CIT | Security Patch | cit_security_patch | Done | done | N | N | N | N | N | Y | N | N | N | project+type | Y | |
| CIT | Security Patch | cit_security_patch | Cancelled | cancelled | N | N | N | N | N | N | Y | N | N | project+type | Y | |
| any | unmatched project/type/status | resolved profile/simple | unknown label | unknown | N | N | N | N | N | N | N | N | N | safe fallback | n/a | Raw status retained; `unmapped_status` diagnostic |

## Verification result

- All configured projects were readable: UX, WS, AGTC, AIVA, AGP, ADF, PRD,
  ARCH, CRC, CIT.
- Jira metadata was inspected per issue type, including status category.
- Representative current issues and changelog transitions were sampled.
- The real audit asserts that every metadata status is explicit in the resolved
  profile; no configured metadata status currently uses generic inference.
- Issue-type-specific workflows are separate for AGTC Provider, AGP Story and
  Dev Internals, ADF Incident, three PRD workflows, and three CIT workflows.
- Unknown labels outside current Jira metadata remain safe and diagnostic.
