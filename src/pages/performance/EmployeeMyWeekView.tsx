import { Badge } from "../../components/Badge/Badge";
import { ExternalLink } from "lucide-react";
import type {
  EmployeeCompletedRowView,
  EmployeeMyWeekSnapshot,
  EmployeeWorkRowView,
} from "../../domain/performance";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { openExternalUrl } from "../../platform/openExternal";
import { GroupedAttentionList } from "./GroupedAttentionList";
import { PersonWorkRow } from "./PersonWorkRow";

async function openIssueInJira(issueKey: string) {
  const prefs = await loadPreferences();
  const url = buildJiraIssueBrowseUrl(resolveJiraBaseUrl(prefs), issueKey);
  await openExternalUrl(url);
}

function MyWeekSummary({ summary }: { summary: EmployeeMyWeekSnapshot["summary"] }) {
  return (
    <div className="employee-my-week-summary" aria-label="Week summary">
      {summary.map((metric) => (
        <div key={metric.label} className="employee-my-week-summary__item">
          <span className="employee-my-week-summary__label">{metric.label}</span>
          <span className="employee-my-week-summary__value">{metric.value}</span>
        </div>
      ))}
    </div>
  );
}

function WorkRowList({ items }: { items: EmployeeWorkRowView[] }) {
  return (
    <div className="performance-work-list">
      {items.map((item) => (
        <PersonWorkRow key={item.key} item={item} />
      ))}
    </div>
  );
}

function CompletedRow({ item }: { item: EmployeeCompletedRowView }) {
  const metaParts = [item.completedOn, item.cycle ? `${item.cycle} cycle` : null].filter(
    Boolean,
  ) as string[];

  return (
    <div className="performance-work-row performance-work-row--person">
      <div className="performance-work-row__main">
        <div className="person-work-row__head">
          <span className="performance-work-row__key">{item.key}</span>
          {item.outcome ? (
            <Badge variant={item.outcome === "First pass" ? "success" : "warning"}>
              {item.outcome}
            </Badge>
          ) : null}
        </div>
        <div className="performance-work-row__title performance-work-row__title--wrap">
          {item.title}
        </div>
        {metaParts.length ? (
          <div className="performance-work-row__meta person-work-row__foot">
            <span>{metaParts.join(" · ")}</span>
            <button
              type="button"
              className="person-work-row__jira"
              aria-label={`Open ${item.key} in Jira`}
              onClick={() => void openIssueInJira(item.key)}
            >
              <ExternalLink size={15} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EmployeeMyWeekView({ myWeek }: { myWeek: EmployeeMyWeekSnapshot }) {
  return (
    <>
      <section aria-label="My week summary">
        <MyWeekSummary summary={myWeek.summary} />
      </section>

      {myWeek.needsAttention.length > 0 ? (
        <section aria-label="Needs attention">
          <h3 className="performance-section__title">Needs attention</h3>
          <GroupedAttentionList items={myWeek.needsAttention} />
        </section>
      ) : null}

      {myWeek.inReview.length > 0 ? (
        <section aria-label="In review">
          <h3 className="performance-section__title">In review</h3>
          <WorkRowList items={myWeek.inReview} />
        </section>
      ) : null}

      {myWeek.inProgress.length > 0 ? (
        <section aria-label="In progress">
          <h3 className="performance-section__title">In progress</h3>
          <WorkRowList items={myWeek.inProgress} />
        </section>
      ) : null}

      {myWeek.completedThisWeek.length > 0 ? (
        <section aria-label="Completed this week">
          <h3 className="performance-section__title">Completed this week</h3>
          <div className="performance-work-list">
            {myWeek.completedThisWeek.map((item) => (
              <CompletedRow key={item.key} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
