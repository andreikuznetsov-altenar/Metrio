import { useEffect, useState } from "react";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import { Select } from "../../components/Select/Select";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { useWorkGraph } from "../../app/WorkGraphContext";
import { canOpenPersonBrief } from "../../domain/personAccess";
import type { DateRangeKey } from "../../domain/performance";
import { formatPersonBriefPlainText } from "../../domain/personBrief/formatPersonBriefText";
import { buildPersonBriefPdfPayload } from "../../domain/personBrief/personBriefPdf";
import { usePersonBriefModel } from "../../hooks/usePersonBriefModel";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { openExternalUrl } from "../../platform/openExternal";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { exportPerformancePdf } from "../../services/export/pdfExport";
import { useToast } from "../../components/Toast/ToastContext";
import "./person-brief-drawer.css";

const PERIOD_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
];

export interface PersonBriefDrawerProps {
  personId: string | null;
  open: boolean;
  onClose: () => void;
  initialPeriodPreset?: DateRangeKey;
  prepForOneOnOne?: boolean;
}

export function PersonBriefDrawer({
  personId,
  open,
  onClose,
  initialPeriodPreset,
  prepForOneOnOne = false,
}: PersonBriefDrawerProps) {
  const { currentUser } = useCurrentUser();
  const { data } = usePerformanceData();
  const surveyData = useFeedbackSurveyStore((state) => state.data);
  const graph = useWorkGraph();
  const { success: toastSuccess, error: toastError } = useToast();
  const [periodPreset, setPeriodPreset] = useState<DateRangeKey>("30d");
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initialPeriodPreset) {
      setPeriodPreset(initialPeriodPreset);
    }
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, [open, initialPeriodPreset]);

  const allowed =
    personId != null && canOpenPersonBrief(currentUser, personId);

  const knowledgeLinks = [
    ...graph.knowledgeByIssue.values(),
    ...graph.knowledgeByProject.values(),
  ].flat();

  const brief = usePersonBriefModel({
    personId: personId ?? "",
    periodPreset,
    data,
    selfPersonId: currentUser.person.id,
    surveyData,
    knowledgeLinks,
    jiraBaseUrl,
  });

  if (!open || !personId || !allowed) {
    return null;
  }

  const handleCopy = async () => {
    if (!brief) return;
    const text = formatPersonBriefPlainText(brief);
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess("Brief copied");
    } catch {
      toastError("Could not copy brief");
    }
  };

  const handleExport = async () => {
    if (!brief) return;
    const result = await exportPerformancePdf(buildPersonBriefPdfPayload(brief));
    if (result.status === "saved") {
      toastSuccess("Brief exported");
    } else if (result.status === "error") {
      toastError(result.userMessage);
    }
  };

  const openIssue = async (issueKey: string) => {
    const url = buildJiraIssueBrowseUrl(jiraBaseUrl, issueKey);
    await openExternalUrl(url);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel={`1:1 brief for ${brief?.personName ?? "team member"}`}
      size="person"
      className="drawer--person-brief"
      header={
        brief ? (
          <div className="person-brief__header">
            <PersonAvatar
              employeeId={brief.personId}
              displayName={brief.personName}
              size="md"
            />
            <div>
              <h2 className="person-brief__title">{brief.personName}</h2>
              {prepForOneOnOne ? (
                <p className="person-brief__meta person-brief__meta--prep">
                  Prepare for 1:1
                </p>
              ) : null}
              <p className="person-brief__meta">
                {brief.role} · {brief.periodLabel}
              </p>
              <p className="person-brief__meta">
                {brief.availability}
                {brief.newStarter ? ` · ${brief.newStarter.headline}` : ""}
              </p>
            </div>
          </div>
        ) : null
      }
    >
      {!brief ? (
        <p className="person-brief__empty">Brief is not available yet.</p>
      ) : (
        <div className="person-brief__body" data-testid="person-brief-drawer">
          <div className="person-brief__toolbar">
            <Select
              label="Period"
              value={periodPreset}
              options={PERIOD_OPTIONS}
              onChange={(event) =>
                setPeriodPreset(event.target.value as DateRangeKey)
              }
            />
            <div className="person-brief__actions">
              <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
                Copy summary
              </Button>
              <Button type="button" variant="secondary" onClick={() => void handleExport()}>
                Export PDF
              </Button>
            </div>
          </div>

          {brief.newStarter ? (
            <p className="person-brief__note">{brief.newStarter.limitedHistoryNote}</p>
          ) : null}

          {brief.timeOff ? (
            <section className="person-brief__section">
              <h3>Time off</h3>
              <p>
                {brief.timeOff.headline} · {brief.timeOff.rangeLabel}
              </p>
              {brief.timeOff.activeWorkCount > 0 ? (
                <p className="person-brief__muted">
                  {brief.timeOff.activeWorkCount} active tasks in Metrio scope
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="person-brief__section">
            <h3>Recent performance</h3>
            <ul className="person-brief__kpi-list">
              {brief.performanceKpis.map((kpi) => (
                <li key={kpi.label}>
                  <span className="person-brief__kpi-label">{kpi.label}</span>
                  <span className="person-brief__kpi-value">{kpi.value}</span>
                  {kpi.contextLabel ? (
                    <span className="person-brief__kpi-context">
                      {kpi.contextLabel} {kpi.contextCaption}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {brief.cycleTime.length ? (
              <ul className="person-brief__kpi-list">
                {brief.cycleTime.map((segment) => (
                  <li key={segment.label}>
                    <span className="person-brief__kpi-label">{segment.label}</span>
                    <span className="person-brief__kpi-value">{segment.value}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="person-brief__section">
            <h3>Current work</h3>
            <p className="person-brief__muted">
              {brief.currentWork.activeCount} active · {brief.currentWork.inReviewCount} in
              review · {brief.currentWork.problematicCount} at risk
            </p>
            <ul className="person-brief__task-list">
              {brief.currentWork.topTasks.map((task) => (
                <li key={task.issueKey}>
                  <button
                    type="button"
                    className="person-brief__task-button"
                    onClick={() => void openIssue(task.issueKey)}
                  >
                    <span>{task.issueKey}</span>
                    <span>{task.title}</span>
                    <span className="person-brief__muted">
                      {task.status} · {task.stageAge}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="person-brief__section">
            <h3>Recently completed</h3>
            {brief.completedWork.length === 0 ? (
              <p className="person-brief__muted">No completed work in this period.</p>
            ) : (
              <ul className="person-brief__task-list">
                {brief.completedWork.map((item) => (
                  <li key={item.issueKey}>
                    <button
                      type="button"
                      className="person-brief__task-button"
                      onClick={() => void openIssue(item.issueKey)}
                    >
                      <span>{item.issueKey}</span>
                      <span>{item.title}</span>
                      <span className="person-brief__muted">{item.completedLabel}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {brief.attention.length ? (
            <section className="person-brief__section">
              <h3>Attention</h3>
              <ul className="person-brief__attention-list">
                {brief.attention.map((group) => (
                  <li key={`${group.label}-${group.reason}`}>
                    {group.taskCount} · {group.reason}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {brief.backflows.count > 0 ? (
            <section className="person-brief__section">
              <h3>Backflows</h3>
              <p>{brief.backflows.count} in period</p>
            </section>
          ) : null}

          {brief.feedbackLines.length ? (
            <section className="person-brief__section">
              <h3>Feedback</h3>
              <ul>
                {brief.feedbackLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {brief.resources.length ? (
            <section className="person-brief__section">
              <h3>Team resources</h3>
              <ul className="person-brief__resource-list">
                {brief.resources.map((resource) => (
                  <li key={resource.title}>
                    {resource.url.startsWith("http") ? (
                      <button
                        type="button"
                        className="person-brief__link"
                        onClick={() => void openExternalUrl(resource.url)}
                      >
                        {resource.title}
                      </button>
                    ) : (
                      resource.title
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {brief.prompts.length ? (
            <section className="person-brief__section person-brief__section--prompts">
              <h3>Discussion prompts</h3>
              <p className="person-brief__muted">Neutral prompts based on facts above.</p>
              <ul className="person-brief__prompt-list">
                {brief.prompts.map((prompt) => (
                  <li key={prompt.id}>
                    <p className="person-brief__prompt-fact">{prompt.fact}</p>
                    <p className="person-brief__prompt-text">{prompt.prompt}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="person-brief__footer-note">{brief.generatedNote}</p>
        </div>
      )}
    </Drawer>
  );
}
