import { Badge } from "../../../components/Badge/Badge";
import { HelpIcon } from "../../../components/HelpIcon/HelpIcon";
import type { ScopeHealthSummary } from "../../../domain/home/executiveDashboardModel";

const SEVERITY_VARIANT = {
  healthy: "success",
  watch: "warning",
  critical: "danger",
} as const;

export function DashboardScopeHealthSummary({
  scopeLabel,
  summary,
}: {
  scopeLabel: string;
  summary: ScopeHealthSummary;
}) {
  return (
    <section
      className="executive-dashboard__span-12 executive-scope-health"
      aria-label="Scope health"
      data-testid="dashboard-scope-health"
    >
      <div className="executive-scope-health__row">
        <span className="executive-scope-health__scope">{scopeLabel} scope</span>
        <Badge variant={SEVERITY_VARIANT[summary.severity]}>{summary.severity}</Badge>
        <span className="executive-scope-health__line">{summary.line}</span>
        <HelpIcon label={summary.tooltip} className="executive-scope-health__help" />
      </div>
    </section>
  );
}
