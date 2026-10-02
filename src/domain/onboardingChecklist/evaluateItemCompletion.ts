import type { ChecklistItemDefinition } from "../../config/onboardingChecklistDefinitions";
import type { Person } from "../people/types";
import type { SurveyDataFile } from "../survey/types";
import type {
  ManualCompletionRecord,
  OnboardingItem,
  OnboardingItemEvidence,
  OnboardingItemStatus,
} from "./onboardingChecklistTypes";
import type { BambooChecklistSignals } from "./bambooChecklistSignals";
import { formatSuggestedDueLabel } from "./onboardingPhases";
import type { OnboardingResourceTarget } from "../onboarding/resourceTypes";

export interface EvaluateItemInput {
  def: ChecklistItemDefinition;
  person: Person;
  employeeEmail: string;
  manual?: ManualCompletionRecord;
  bamboo: BambooChecklistSignals;
  surveyData: SurveyDataFile | null | undefined;
  target?: OnboardingResourceTarget;
}

function manualComplete(manual?: ManualCompletionRecord): boolean {
  return Boolean(manual?.completedAt && !manual.undoneAt);
}

function feedbackComplete(
  def: ChecklistItemDefinition,
  email: string,
  surveyData: SurveyDataFile | null | undefined,
): OnboardingItemEvidence | null {
  if (!surveyData?.surveys?.length || !def.feedbackTemplateId) return null;
  const normalized = email.trim().toLowerCase();
  for (const survey of surveyData.surveys) {
    if (survey.templateId && survey.templateId !== def.feedbackTemplateId) continue;
    const recipient = survey.recipients.find(
      (r) => r.reporterEmail.trim().toLowerCase() === normalized && r.respondedAt,
    );
    if (recipient) {
      return {
        kind: "feedback_state",
        summary: "Feedback submitted",
        at: recipient.respondedAt ?? undefined,
      };
    }
  }
  return null;
}

export function evaluateChecklistItem(input: EvaluateItemInput): OnboardingItem {
  const { def, person, manual, bamboo, surveyData, target } = input;
  let status: OnboardingItemStatus = "pending";
  let evidence: OnboardingItemEvidence | undefined;
  let autoCompleted = false;
  const canManualComplete =
    def.completionMode === "manual" || def.completionMode === "confluence_explicit";
  const canManualUndo = canManualComplete;

  if (manualComplete(manual)) {
    status = "complete";
    evidence = {
      kind: "manual",
      summary: "Marked complete",
      at: manual!.completedAt,
    };
  } else {
    switch (def.completionMode) {
      case "manual":
        break;
      case "confluence_explicit":
        break;
      case "bamboo_api":
        if (bamboo.evaluated && !bamboo.pendingOnboarding) {
          status = "complete";
          autoCompleted = true;
          evidence = {
            kind: "bamboo_api",
            summary: "No pending BambooHR onboarding tasks",
          };
        }
        break;
      case "jira_api":
        if (def.jiraSignal === "access") {
          if (person.jira?.accountId) {
            status = "complete";
            autoCompleted = true;
            evidence = {
              kind: "jira_api",
              summary: "Jira account linked",
            };
          }
        } else if (def.jiraSignal === "first_assignment") {
          if (person.ownedIssues.length > 0) {
            status = "complete";
            autoCompleted = true;
            evidence = {
              kind: "jira_api",
              summary: "At least one assigned issue in Jira",
            };
          }
        }
        break;
      case "feedback_state": {
        const proof = feedbackComplete(def, input.employeeEmail, surveyData);
        if (proof) {
          status = "complete";
          autoCompleted = true;
          evidence = proof;
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    id: def.id,
    title: def.title,
    description: def.description,
    category: def.category,
    source: def.source,
    completionMode: def.completionMode,
    status,
    phase: def.phase,
    target,
    dueDay: def.dueDay,
    dueLabel: def.dueDay != null ? formatSuggestedDueLabel(def.dueDay) : undefined,
    evidence,
    isMilestone: def.isMilestone,
    canManualComplete: canManualComplete && status !== "complete",
    canManualUndo: canManualUndo && status === "complete" && !autoCompleted,
    autoCompleted,
  };
}
