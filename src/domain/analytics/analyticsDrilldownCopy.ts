import { performanceHelp } from "../performance/performanceHelp";
import type { AnalyticsDrilldownMetric } from "./analyticsEvidenceTypes";

export const analyticsDrilldownDescription: Record<AnalyticsDrilldownMetric, string> = {
  completed: performanceHelp.completed,
  first_pass: performanceHelp.firstPass,
  backflows: performanceHelp.backflows,
  avg_cycle:
    "Average full cycle duration for work completed in the selected period (from team trend data).",
  efficiency: performanceHelp.efficiency,
};

export const analyticsDrilldownTitle: Record<AnalyticsDrilldownMetric, string> = {
  completed: "Completed",
  first_pass: "First pass",
  backflows: "Backflows",
  avg_cycle: "Avg cycle",
  efficiency: "Efficiency",
};
