import type { PersonWorkRowData } from "../analytics/personAnalyticsWorkspace";
import type { DateRangeKey, MetricCardData } from "../performance";
import type { GroupedAttentionSignal } from "../../pages/performance/groupAttentionSignals";
import type { PersonBriefPrompt } from "./buildPersonBriefPrompts";

export interface PersonBriefCompletedItem {
  issueKey: string;
  title: string;
  completedLabel: string;
  metaLine: string;
  firstPass: boolean;
}

export interface PersonBriefModel {
  personId: string;
  personName: string;
  role: string;
  periodPreset: DateRangeKey;
  periodLabel: string;
  availability: string;
  workload: string;
  timeOff?: {
    headline: string;
    rangeLabel: string;
    activeWorkCount: number;
  };
  newStarter?: {
    headline: string;
    limitedHistoryNote: string;
  };
  performanceKpis: MetricCardData[];
  cycleTime: { label: string; value: string }[];
  currentWork: {
    activeCount: number;
    inReviewCount: number;
    problematicCount: number;
    topTasks: PersonWorkRowData[];
  };
  completedWork: PersonBriefCompletedItem[];
  attention: GroupedAttentionSignal[];
  backflows: { count: number; issueKeys: string[] };
  feedbackLines: string[];
  resources: {
    title: string;
    url: string;
    source: import("../onboarding/resourceTypes").OnboardingResourceSource;
    subtitle?: string;
  }[];
  prompts: PersonBriefPrompt[];
  generatedNote: string;
}
