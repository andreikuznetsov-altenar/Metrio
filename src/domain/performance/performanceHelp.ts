export const performanceHelp = {
  throughput:
    "Successful completion cycles in the selected reporting period. Raw count is not a health or performance score.",
  firstPass:
    "Share of completed work accepted without returning to an earlier workflow stage.",
  completed: "Work completed within the selected reporting period.",
  backflows:
    "Qualifying review or QA returns during the selected period. Multiple returns in one cycle are counted separately.",
  teamAttention:
    "People with workload, task-health or availability signals that may need attention.",
  teamTrends:
    "Change in team performance compared with the previous comparable period.",
  teamWorkload:
    "Current unfinished Jira queue weighted by workflow stage and task-health risk. Active is the hands-on active-stage count; historical capacity is shown separately.",
  timeOff: "Planned team time off over the next 12 months from BambooHR.",
  people:
    "Team performance, workload, availability and attention signals for the selected period.",
  radar:
    "People with active task-health or workload signals that may require attention.",
  deliveryRisk:
    "Current Jira work with delivery-risk signals such as inactivity, rework or blocking states.",
  atRiskTasks:
    "Active tasks flagged at risk by cycle-time rules (not the same as Radar signals).",
} as const;

export type PerformanceHelpKey = keyof typeof performanceHelp;
