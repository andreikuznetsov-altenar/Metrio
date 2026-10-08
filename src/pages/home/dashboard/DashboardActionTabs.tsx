import { useState } from "react";
import type { ActionItem } from "../../../domain/actions/actionTypes";
import type { ExecutiveActionTab } from "../../../domain/home/executiveDashboardModel";
import { Tabs } from "../../../components/Tabs/Tabs";
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
  if (!tabs.length) return null;

  return (
    <div
      className="executive-dashboard__span-12 dashboard-section"
      data-testid="dashboard-action-tabs"
    >
      <Tabs
        value={activeId}
        onValueChange={setActiveId}
        items={tabs.map((tab) => ({
          value: tab.id,
          label: tab.label,
          content: (
            <DashboardQueuePanel
              title={tab.label}
              hideTitle
              workColumnLabel="Work"
              items={tab.items}
              emptyMessage={tab.emptyMessage}
              onOpen={onOpenAction}
              openLabel={actionOpenLabel}
              testId={`dashboard-tab-${tab.id}`}
              footerAction={footerByTab?.[tab.id]}
              teamPersons={teamPersons}
              onOpenJiraIssue={onOpenJiraIssue}
              sortable={tab.id === "focus"}
            />
          ),
        }))}
      />
    </div>
  );
}
