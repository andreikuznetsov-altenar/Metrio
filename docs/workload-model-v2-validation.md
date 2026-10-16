# Current Workload Model V2 — real-cache validation

Validated on 2026-10-16 against the local production dashboard cache. The cache supplied 159 completed execution samples, 325 review/QA visits, and 301 queued-start samples. It contained no structured Jira time estimates, so this run exercised the historical-median hierarchy and documented fallbacks. Fresh Jira fetches now request `timeoriginalestimate`, `timeestimate`, and `duedate`.

## Full visible team before / after

The old score is the retired generic queue score and is not a percentage. Historical capacity remains shown only to demonstrate that it does not determine the V2 result.

| Person | Cached old level | Old score | Historical capacity | V2 level | V2 current load | Expected / available | Assigned | Hands-on | Review | Hold | Queued |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Andrei Kuznetsov | Light | 0.0 | 0.0% | Light | 0.0% | 0.00 / 80h | 11 | 0 | 0 | 0 | 0 |
| Daria Chernova | Overloaded | 16.4 | 15.5% | Light | 10.4% | 8.32 / 80h | 24 | 0 | 20 | 4 | 0 |
| Valeriia Pavlova | Overloaded | 12.1 | 44.1% | Light | 34.7% | 27.75 / 80h | 14 | 1 | 9 | 3 | 1 |
| Nikita Utkin | Light | 0.3 | 17.6% | Light | 0.0% | 0.00 / 80h | 3 | 0 | 0 | 3 | 0 |
| Konstantin Zhuikov | Light | 0.0 | 3.1% | Light | 0.0% | 0.00 / 80h | 0 | 0 | 0 | 0 | 0 |

## Valeriia Pavlova

Total: **27.75h / 80h = 34.7% (Light)**. Components: 17.42h hands-on remaining + 1.02h review reserve + 9.31h expected queued work. The three On Hold issues contribute zero.

| Issue | Status | Mode | Elapsed | Start / return P | Rework / remaining | Contribution | Source |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| AGTC-131 | On Hold | external_wait | — | — | — | 0.00h | not applicable |
| AGTC-132 | In Review | reserve | — | 2.6% | 4.00h rework | 0.10h | person + profile + type |
| AGTC-133 | On Hold | external_wait | — | — | — | 0.00h | not applicable |
| AGTC-143 | In Review | reserve | — | 2.6% | 4.00h rework | 0.10h | person + profile + type |
| AGTC-144 | In Review | reserve | — | 2.6% | 4.00h rework | 0.10h | person + profile + type |
| AGTC-146 | On Hold | external_wait | — | — | — | 0.00h | not applicable |
| AGTC-148 | In Review | reserve | — | 2.6% | 4.00h rework | 0.10h | person + profile + type |
| AGTC-154 | In Review | reserve | — | 2.6% | 4.00h rework | 0.10h | person + profile + type |
| AGTC-155 | In Review | reserve | — | 2.6% | 4.00h rework | 0.10h | person + profile + type |
| AGTC-160 | In Review | reserve | — | 2.6% | 4.00h rework | 0.10h | person + profile + type |
| UX-5808 | In Review | reserve | — | 33.8% | 0.46h rework | 0.16h | person + profile + type |
| UX-5839 | In Progress | hands_on | 5.17h | — | 17.42h remaining | 17.42h | person + profile + type, elapsed-conditional |
| UX-5841 | TODO | queued | — | 92.7% start | 10.04h total | 9.31h | person + profile + type |
| UX-5850 | In Review | reserve | — | 33.8% | 0.46h rework | 0.16h | person + profile + type |

## Daria Chernova

Total: **8.32h / 80h = 10.4% (Light)**. All expected effort is review-backflow reserve. The four On Hold issues contribute zero, and there are no hands-on or queued issues.

| Issue | Status | Mode | Return P | Expected rework | Contribution | Source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| AGTC-119 | On Hold | external_wait | — | — | 0.00h | not applicable |
| AGTC-126 | On Hold | external_wait | — | — | 0.00h | not applicable |
| AGTC-141 | On Hold | external_wait | — | — | 0.00h | not applicable |
| AGTC-150 | On Hold | external_wait | — | — | 0.00h | not applicable |
| AGTC-151 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-152 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-153 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-156 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-157 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-158 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-159 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-161 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-162 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-163 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-164 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-165 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-166 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| AGTC-167 | In Review | reserve | 4.9% | 4.00h | 0.20h | person + profile + type |
| UX-5446 | In Review | reserve | 12.9% | 7.11h | 0.92h | person + profile + type |
| UX-5448 | In Review | reserve | 12.9% | 7.11h | 0.92h | person + profile + type |
| UX-5600 | In Review | reserve | 12.9% | 7.11h | 0.92h | person + profile + type |
| UX-5716 | In Review | reserve | 12.9% | 7.11h | 0.92h | person + profile + type |
| UX-5727 | In Review | reserve | 12.9% | 7.11h | 0.92h | person + profile + type |
| UX-5735 | In Review | reserve | 12.9% | 7.11h | 0.92h | person + profile + type |

## Hierarchical aggregation

The visible cache has five people but does not retain supervisor links for the four team members, so it cannot reconstruct named nested child teams. For the complete visible five-person unit, the old hierarchy input (equal average of historical-capacity percentages) is **16.1%**. V2 is **36.07 expected hours / 400 available hours = 9.0% current load**.

The recursive unequal-size regression uses a 2-person child unit at 100% and a 10-person child unit at 0%, plus a 0% parent. Equal average-of-averages would report 33.3%; V2 correctly reports **15.4%** (`160h / 1,040h`).
