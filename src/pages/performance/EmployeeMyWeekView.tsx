import { Badge } from "../../components/Badge/Badge";
import { Card } from "../../components/Card/Card";
import type { EmployeeMyWeekSnapshot } from "../../domain/performance";

export function EmployeeMyWeekView({ myWeek }: { myWeek: EmployeeMyWeekSnapshot }) {
  return (
    <>
      <section aria-label="My week summary">
        <div className="performance-metrics">
          {myWeek.summary.map((metric) => (
            <Card key={metric.label} className="performance-metric-card">
              <div className="performance-metric-card__label">{metric.label}</div>
              <div className="performance-metric-card__value">{metric.value}</div>
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Needs attention">
        <h3 className="performance-section__title">Needs attention</h3>
        {myWeek.needsAttention.length === 0 ? (
          <div className="performance-empty performance-work-list">
            Nothing needs your attention right now.
          </div>
        ) : (
          <div className="performance-work-list">
            {myWeek.needsAttention.map((item) => (
              <div key={item.reason} className="performance-work-row">
                <div className="performance-work-row__main">
                  <Badge variant={item.variant}>{item.label}</Badge>
                  <div className="performance-work-row__meta">{item.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <TaskGroup title="In progress" items={myWeek.inProgress} />
      <TaskGroup title="In review" items={myWeek.inReview} />
      <TaskGroup title="Completed this week" items={myWeek.completedThisWeek} />
    </>
  );
}

function TaskGroup({
  title,
  items,
}: {
  title: string;
  items: { key: string; title: string; status: string }[];
}) {
  return (
    <section aria-label={title}>
      <h3 className="performance-section__title">{title}</h3>
      {items.length === 0 ? (
        <div className="performance-empty performance-work-list">None</div>
      ) : (
        <div className="performance-work-list">
          {items.map((item) => (
            <div key={item.key} className="performance-work-row">
              <div className="performance-work-row__key">{item.key}</div>
              <div className="performance-work-row__main">
                <div className="performance-work-row__title">{item.title}</div>
                <div className="performance-work-row__meta">{item.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
