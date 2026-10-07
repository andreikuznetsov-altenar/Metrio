import { Drawer } from "../../components/Drawer/Drawer";
import type { WorkDependency } from "../../domain/dependencies/dependencyTypes";
import { buildDrawerChain } from "../../domain/dependencies/buildDeliveryDependencyGraph";
import type { DeliveryDependencyIndex } from "../../domain/dependencies/dependencyTypes";
import { formatStageAgeLabel } from "../../domain/radar/taskSignals";
import { JiraIssueLink } from "../../components/JiraIssueLink/JiraIssueLink";
import type { AuditIssue } from "../../domain/jira/types";

export function DependencyDetailDrawer({
  dependency,
  index,
  jiraBaseUrl,
  issueByKey,
  open,
  onClose,
}: {
  dependency: WorkDependency | null;
  index: DeliveryDependencyIndex | null;
  jiraBaseUrl: string;
  issueByKey: Map<string, AuditIssue>;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !dependency || !index) return null;

  const blockerIssue = issueByKey.get(dependency.targetIssueKey);
  const chain = buildDrawerChain(index, dependency.sourceIssueKey);
  const stageLabel = blockerIssue
    ? formatStageAgeLabel(blockerIssue, new Date())
    : "—";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="Dependency detail"
      size="notification"
      className="drawer--dependency-detail"
      header={
        <div>
          <h2 className="project-cockpit__title">{dependency.sourceIssueKey}</h2>
          <p className="project-cockpit__meta">Blocked by {dependency.targetIssueKey}</p>
        </div>
      }
    >
      <div data-testid="dependency-detail-drawer">
        <p>
          <strong>{dependency.targetIssueKey}</strong> · {dependency.targetStatus} ·{" "}
          {stageLabel}
        </p>
        <p className="project-cockpit__muted">{dependency.targetSummary}</p>
        {dependency.targetPersonName ? (
          <p>Owner · {dependency.targetPersonName}</p>
        ) : null}
        <p>
          {dependency.sourceProject} → {dependency.targetProject}
          {dependency.crossTeam ? " · cross-team" : ""}
        </p>
        {chain.length > 1 ? (
          <ul className="project-cockpit__signals">
            {chain.map((link) => (
              <li key={link.issueKey}>
                <JiraIssueLink issueKey={link.issueKey} jiraBaseUrl={jiraBaseUrl} />
                {link.blockedByKey ? (
                  <>
                    {" ← "}
                    <JiraIssueLink issueKey={link.blockedByKey} jiraBaseUrl={jiraBaseUrl} />
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <JiraIssueLink
          issueKey={dependency.targetIssueKey}
          jiraBaseUrl={jiraBaseUrl}
          className="project-cockpit__secondary-link"
        >
          Open in Jira
        </JiraIssueLink>
      </div>
    </Drawer>
  );
}
