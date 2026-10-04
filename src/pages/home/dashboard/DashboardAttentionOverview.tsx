import type { DashboardAttentionStat } from "../../../domain/home/buildDashboardAttentionOverview";

export function DashboardAttentionOverview({ stats }: { stats: DashboardAttentionStat[] }) {
  return (
    <section
      className="executive-dashboard__span-12 executive-attention"
      aria-label="Attention overview"
      data-testid="dashboard-attention-overview"
    >
      {stats.map((stat) => (
        <div
          key={stat.id}
          className={`executive-attention__stat executive-attention__stat--${stat.tone}`}
        >
          <span className="executive-attention__value">{stat.value}</span>
          <span className="executive-attention__label">{stat.label}</span>
        </div>
      ))}
    </section>
  );
}
