import { Badge } from "../../components/Badge/Badge";
import { CheckCircle2 } from "lucide-react";
import { GroupedIssuePreview } from "../../components/GroupedIssuePreview/GroupedIssuePreview";
import type { PersonalAttentionItem } from "../../domain/performance";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { groupAttentionSignals } from "./groupAttentionSignals";
import { useEffect, useState } from "react";
import { usePerformanceData } from "../../app/PerformanceDataContext";

export interface GroupedAttentionListProps {
  items: PersonalAttentionItem[];
  emptyMessage?: string;
}

export function GroupedAttentionList({
  items,
  emptyMessage = "Nothing needs your attention right now.",
}: GroupedAttentionListProps) {
  const { data } = usePerformanceData();
  const teamPersons = data?.teamSnapshot.persons ?? [];
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const grouped = groupAttentionSignals(items);

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);

  if (grouped.length === 0) {
    return (
      <p className="performance-attention-empty" role="status">
        <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden />
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="performance-work-list">
      {grouped.map((group) => (
        <div
          key={`${group.label}-${group.reason}`}
          className="performance-work-row performance-work-row--drawer performance-work-row--attention"
        >
          <div className="performance-work-row__main">
            <div className="performance-attention-group__head">
              <Badge variant={group.variant}>{group.label}</Badge>
              <span className="performance-attention-group__count">
                {group.taskCount} {group.taskCount === 1 ? "task" : "tasks"}
              </span>
            </div>
            <div className="performance-work-row__meta">{group.reason}</div>
            {group.issueKeys.length > 0 && jiraBaseUrl ? (
              <GroupedIssuePreview
                issueKeys={group.issueKeys}
                jiraBaseUrl={jiraBaseUrl}
                persons={teamPersons}
                modalTitle={group.label}
                className="performance-attention-group__keys"
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
