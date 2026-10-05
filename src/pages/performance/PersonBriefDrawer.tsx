import { useEffect, useState } from "react";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { PersonCycleTimeCard } from "../../components/PersonCycleTimeCard/PersonCycleTimeCard";
import { ResourceRow } from "../../components/ResourceRow/ResourceRow";
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
import { AttentionSignalsTable } from "./AttentionSignalsTable";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { openExternalUrl } from "../../platform/openExternal";
import { exportPerformancePdf } from "../../services/export/pdfExport";
import { useToast } from "../../components/Toast/ToastContext";
import { PersonAnalyticsMetricGrid } from "./PersonAnalyticsMetricGrid";
import { PersonWorkRow } from "./PersonWorkRow";
import { AnalyticsIssueRow } from "./AnalyticsIssueRow";
import { PersonIdentityHeader } from "./PersonIdentityHeader";
import "./person-brief-drawer.css";
import "./person-identity-header.css";
import "./person-work-card.css";
import "./performance-dashboard.css";
import "./person-detail-drawer.css";

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
  const { data, viewModels } = usePerformanceData();
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

  const person = personId ? viewModels?.getPerson(personId) : undefined;

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

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel={`1:1 brief for ${brief?.personName ?? "team member"}`}
      size="person"
      className="drawer--person-brief"
      header={
        brief ? (
          <PersonIdentityHeader
            personId={brief.personId}
            displayName={brief.personName}
            jobTitle={brief.role}
            person={person}
            availabilityLabel={brief.availability}
            workloadLabel={brief.workload}
            contextNote={prepForOneOnOne ? "Prepare for 1:1" : undefined}
          />
        ) : null
      }
    >
      {!brief ? (
        <p className="person-brief__empty" role="status">
          Brief is not available yet.
        </p>
      ) : (
        <div className="person-brief__body" data-testid="person-brief-drawer">
          <div className="person-brief__toolbar">
            <div className="person-brief__period">
              <Select
                aria-label="Brief period"
                value={periodPreset}
                options={PERIOD_OPTIONS}
                onChange={(event) =>
                  setPeriodPreset(event.target.value as DateRangeKey)
                }
              />
            </div>
            <div className="person-brief__actions">
              <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
                Copy summary
              </Button>
              <Button type="button" variant="secondary" onClick={() => void handleExport()}>
                Export PDF
              </Button>
            </div>
          </div>

          <p className="person-brief__period-context">{brief.periodLabel}</p>

          {brief.newStarter ? (
            <p className="person-brief__note">{brief.newStarter.limitedHistoryNote}</p>
          ) : null}

          <section className="person-brief__section-card">
            <h3 className="person-brief__section-title">Recent performance</h3>
            <PersonAnalyticsMetricGrid
              metrics={brief.performanceKpis}
              className="performance-metrics performance-metrics--brief"
            />
            <PersonCycleTimeCard segments={brief.cycleTime} />
          </section>

          {brief.currentWork.topTasks.length > 0 ? (
            <section className="person-brief__section-card">
              <h3 className="person-brief__section-title">Current work</h3>
              <p className="person-brief__muted">
                {brief.currentWork.activeCount} active · {brief.currentWork.inReviewCount} in
                review · {brief.currentWork.problematicCount} at risk
              </p>
              <div className="person-brief__work-list">
                {brief.currentWork.topTasks.map((task) => (
                  <PersonWorkRow
                    key={task.key}
                    item={task}
                    variant="inline"
                    jiraBaseUrl={jiraBaseUrl}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {brief.completedWork.length > 0 ? (
            <section className="person-brief__section-card">
              <h3 className="person-brief__section-title">Recently completed</h3>
              <div className="person-brief__history-list">
                {brief.completedWork.map((item) => (
                  <AnalyticsIssueRow
                    key={item.issueKey}
                    hidePerson
                    showOutcome
                    variant="card"
                    jiraAction="secondary-button"
                    metaLine={item.metaLine}
                    issue={{
                      issueKey: item.issueKey,
                      title: item.title,
                      personId: brief.personId,
                      personName: brief.personName,
                      outcome: item.firstPass ? "first_pass" : "rework",
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {brief.attention.length ? (
            <section className="person-brief__section-card">
              <h3 className="person-brief__section-title">Attention</h3>
              <AttentionSignalsTable
                groups={brief.attention}
                jiraBaseUrl={jiraBaseUrl}
                wrapClassName="person-brief__attention-table"
              />
            </section>
          ) : null}

          {brief.timeOff ? (
            <section className="person-brief__section-card">
              <h3 className="person-brief__section-title">Time off</h3>
              <p className="person-brief__section-lead">
                {brief.timeOff.headline}
                {brief.timeOff.rangeLabel ? ` · ${brief.timeOff.rangeLabel}` : ""}
              </p>
              {brief.timeOff.activeWorkCount > 0 ? (
                <p className="person-brief__muted">
                  {brief.timeOff.activeWorkCount} active tasks in scope
                </p>
              ) : null}
            </section>
          ) : null}

          {brief.feedbackLines.length ? (
            <section className="person-brief__section-card">
              <h3 className="person-brief__section-title">Feedback</h3>
              <ul className="person-brief__plain-list">
                {brief.feedbackLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {brief.resources.length ? (
            <section className="person-brief__section-card">
              <h3 className="person-brief__section-title">Knowledge</h3>
              {brief.resources.map((resource) =>
                resource.url.startsWith("http") ? (
                  <ResourceRow
                    key={resource.title}
                    title={resource.title}
                    subtitle={resource.subtitle}
                    source={resource.source}
                    onOpen={() => void openExternalUrl(resource.url)}
                    externalLabel="Open resource"
                  />
                ) : null,
              )}
            </section>
          ) : null}

          {brief.prompts.length ? (
            <section className="person-brief__section-card person-brief__section--prompts">
              <h3 className="person-brief__section-title">Discussion prompts</h3>
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
