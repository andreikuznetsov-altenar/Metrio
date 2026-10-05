export const performanceHelp = {
  efficiency:
    "Overall performance score based on completion, first pass, cycle time and backflows.",
  firstPass:
    "Share of completed work accepted without returning to an earlier workflow stage.",
  completed: "Work completed within the selected reporting period.",
  backflows:
    "Completed work that returned to an earlier workflow stage.",
  teamAttention:
    "People with workload, task-health or availability signals that may need attention.",
  teamTrends:
    "Change in team performance compared with the previous comparable period.",
  teamWorkload:
    "Capacity load extrapolated from completed cycle throughput (monthly hours vs 164h FTE), plus active issue counts for context.",
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
