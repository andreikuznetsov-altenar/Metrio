import { useState } from "react";
import type { ActionItem } from "../../../domain/actions/actionTypes";
import type { ExecutiveActionTab } from "../../../domain/home/executiveDashboardModel";
import { DashboardQueuePanel } from "./DashboardQueuePanel";

export function DashboardActionTabs({
  tabs,
  onOpenAction,
  actionOpenLabel,
  footerByTab,
  teamPersons,
  onOpenJiraIssue,
}: {
  tabs: ExecutiveActionTab[];
  onOpenAction: (item: ActionItem) => void;
  actionOpenLabel: (item: ActionItem) => string;
  footerByTab?: Record<string, { label: string; onClick: () => void } | undefined>;
  teamPersons?: import("../../../domain/people/types").Person[];
  onOpenJiraIssue?: (issueKey: string, url?: string) => void;
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  if (!active) return null;

  return (
    <div className="executive-dashboard__span-12" data-testid="dashboard-action-tabs">
      <div className="executive-action-tabs__bar" role="tablist" aria-label="Dashboard actions">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active.id}
            className={
              tab.id === active.id
                ? "executive-action-tabs__tab executive-action-tabs__tab--active"
                : "executive-action-tabs__tab"
            }
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <DashboardQueuePanel
        title={active.label}
        workColumnLabel="Work"
        items={active.items}
        emptyMessage={active.emptyMessage}
        onOpen={onOpenAction}
        openLabel={actionOpenLabel}
        testId={`dashboard-tab-${active.id}`}
        footerAction={footerByTab?.[active.id]}
        teamPersons={teamPersons}
        onOpenJiraIssue={onOpenJiraIssue}
      />
    </div>
  );
}
