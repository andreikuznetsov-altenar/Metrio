import { useMemo, useState } from "react";
import { RecommendedActionCard } from "../../../components/RecommendedActions/RecommendedActionCard";
import { Button } from "../../../components/Button/Button";
import { TaskListModal } from "../../../components/TaskListModal/TaskListModal";
import { navigatePerformanceView } from "../../../app/actionNavigation";
import { useOptionalPerformanceIssueCatalog } from "../../../app/PerformanceIssueCatalogContext";
import { buildTaskListModalRowsFromIssueKeys } from "../../../domain/actions/buildTaskListModalRows";
import type { ActionItem } from "../../../domain/actions/actionTypes";
import type { Person } from "../../../domain/people/types";
import type { DeliveryRiskRow, WorkloadRow } from "../../../domain/performance";
import {
  MAX_VISIBLE_RECOMMENDED_ACTIONS,
  buildRecommendedActions,
} from "../../../domain/recommendedActions/buildRecommendedActions";
import type { RecommendedAction, RecommendedActionDestination } from "../../../domain/recommendedActions/types";

import { appNow } from "../../../platform/appClock";
export interface RecommendedActionsSectionProps {
  scope: "employee" | "team_lead";
  /** The signed-in person (their own tasks / leave / workload / goals). */
  ownPerson: Person | null;
  /** Team Lead only: everyone in the lead's team scope (own tasks included). */
  teamPersons?: Person[];
  teamWorkload?: WorkloadRow[];
  teamActions?: ActionItem[];
  deliveryRiskRows?: DeliveryRiskRow[];
  jiraBaseUrl?: string;
  onOpenPerson: (personId: string) => void;
  onOpenTeamWorkload: () => void;
  onOpenMyWork: () => void;
  /** Test seam: freezes "now". */
  now?: Date;
}

/**
 * Dashboard "Recommended actions" for Individual Contributors and Team Leads. A pure derived view:
 * it recomputes from the current data on every render and stores nothing, so a resolved problem
 * simply disappears. Hidden entirely when there is nothing to do.
 */
export function RecommendedActionsSection({
  scope,
  ownPerson,
  teamPersons = [],
  teamWorkload = [],
  teamActions = [],
  deliveryRiskRows = [],
  jiraBaseUrl,
  onOpenPerson,
  onOpenTeamWorkload,
  onOpenMyWork,
  now,
}: RecommendedActionsSectionProps) {
  const issueCatalog = useOptionalPerformanceIssueCatalog();
  const [expanded, setExpanded] = useState(false);
  const [issueList, setIssueList] = useState<{ issueKeys: string[]; title: string } | null>(null);

  const actions = useMemo<RecommendedAction[]>(() => {
    const at = now ?? appNow();
    if (scope === "employee") {
      return buildRecommendedActions({
        scope: "employee",
        now: at,
        ownedIssues: ownPerson?.ownedIssues ?? [],
        selfWorkload: ownPerson?.workload ?? null,
        selfAvailability: ownPerson?.availability,
      });
    }
    const seen = new Set<string>();
    const teamIssues = teamPersons.flatMap((p) => p.ownedIssues).filter((i) => (seen.has(i.issueKey) ? false : (seen.add(i.issueKey), true)));
    return buildRecommendedActions({
      scope: "team_lead",
      now: at,
      teamIssues,
      teamWorkload,
      teamActions,
      deliveryRiskRows: deliveryRiskRows.map((r) => ({ issueKey: r.issueKey, ownerId: r.ownerId, ownerName: r.ownerName })),
    });
  }, [scope, ownPerson, teamPersons, teamWorkload, teamActions, deliveryRiskRows, now]);

  const modalPersons = useMemo(() => (scope === "employee" ? (ownPerson ? [ownPerson] : []) : teamPersons), [scope, ownPerson, teamPersons]);
  const issueListRows = useMemo(
    () => (issueList ? buildTaskListModalRowsFromIssueKeys(issueList.issueKeys, modalPersons, jiraBaseUrl, issueCatalog) : []),
    [issueList, modalPersons, jiraBaseUrl, issueCatalog],
  );

  const go = (destination: RecommendedActionDestination) => {
    switch (destination.kind) {
      case "issue_list":
        setIssueList({ issueKeys: destination.issueKeys, title: destination.title });
        return;
      case "delivery_risk":
        navigatePerformanceView("delivery-risk");
        return;
      case "person":
        onOpenPerson(destination.personId);
        return;
      case "team_workload":
        onOpenTeamWorkload();
        return;
      case "my_work":
        onOpenMyWork();
        return;
    }
  };

  if (actions.length === 0) return null;
  const visible = expanded ? actions : actions.slice(0, MAX_VISIBLE_RECOMMENDED_ACTIONS);
  const hidden = actions.length - MAX_VISIBLE_RECOMMENDED_ACTIONS;

  return (
    <section
      className="executive-dashboard__span-12 recommended-actions"
      aria-labelledby="recommended-actions-heading"
      data-testid="recommended-actions"
    >
      <h2 id="recommended-actions-heading" className="executive-panel__title">
        Recommended actions
      </h2>
      <ul className="recommended-actions__list">
        {visible.map((action) => (
          <RecommendedActionCard
            key={action.id}
            id={action.id}
            title={action.title}
            description={action.description}
            actionLabel={action.actionLabel}
            onAction={() => go(action.destination)}
          />
        ))}
      </ul>
      {hidden > 0 ? (
        <div className="recommended-actions__more">
          <Button
            type="button"
            variant="ghost"
            size="compact"
            aria-expanded={expanded}
            data-testid="recommended-actions-toggle"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show fewer actions" : `View all actions (${actions.length})`}
          </Button>
        </div>
      ) : null}
      <TaskListModal
        open={Boolean(issueList)}
        onClose={() => setIssueList(null)}
        title={issueList?.title ?? "Tasks"}
        rows={issueListRows}
      />
    </section>
  );
}
