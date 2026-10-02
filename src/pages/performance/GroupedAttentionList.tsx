import { Badge } from "../../components/Badge/Badge";
import { CheckCircle2 } from "lucide-react";
import type { PersonalAttentionItem } from "../../domain/performance";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { openExternalUrl } from "../../platform/openExternal";
import { groupAttentionSignals, hiddenAttentionKeyCount } from "./groupAttentionSignals";

async function openIssueInJira(issueKey: string) {
  const prefs = await loadPreferences();
  const url = buildJiraIssueBrowseUrl(resolveJiraBaseUrl(prefs), issueKey);
  await openExternalUrl(url);
}

export interface GroupedAttentionListProps {
  items: PersonalAttentionItem[];
  emptyMessage?: string;
}

export function GroupedAttentionList({
  items,
  emptyMessage = "Nothing needs your attention right now.",
}: GroupedAttentionListProps) {
  const grouped = groupAttentionSignals(items);

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
      {grouped.map((group) => {
        const visibleKeys = group.issueKeys.slice(0, 2);
        const extraKeys = hiddenAttentionKeyCount(group.taskCount, visibleKeys);
        return (
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
              {visibleKeys.length > 0 || extraKeys > 0 ? (
                <div className="issue-chip-list performance-attention-group__keys">
                  {visibleKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="performance-attention-key"
                      onClick={() => void openIssueInJira(key)}
                    >
                      {key}
                    </button>
                  ))}
                  {extraKeys > 0 ? (
                    <span className="issue-chip-list__more">+{extraKeys}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
