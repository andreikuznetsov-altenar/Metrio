import { useEffect, useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
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
import type { GroupedAttentionSignal } from "./groupAttentionSignals";
import { usePersonBriefModel } from "../../hooks/usePersonBriefModel";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { openExternalUrl } from "../../platform/openExternal";
import { exportPerformancePdf } from "../../services/export/pdfExport";
import { useToast } from "../../components/Toast/ToastContext";
import { PersonAnalyticsMetricGrid } from "./PersonAnalyticsMetricGrid";
import { PersonWorkRow } from "./PersonWorkRow";
import { AnalyticsIssueRow } from "./AnalyticsIssueRow";
import "./person-brief-drawer.css";

const PERIOD_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
];

function attentionIssuePreview(group: GroupedAttentionSignal): string {
  const keys = group.issueKeys.slice(0, 2);
  if (!keys.length) return `${group.taskCount} tasks`;
  const suffix =
    group.issueKeys.length > keys.length
      ? ` · +${group.issueKeys.length - keys.length}`
      : "";
  return `${keys.join(" · ")}${suffix}`;
}

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
            <div className="person-brief__header-text">
              <h2 className="person-brief__title">{brief.personName}</h2>
              <p className="person-brief__role">{brief.role}</p>
              <p className="person-brief__meta">
                {brief.availability} · {brief.periodLabel}
              </p>
              {prepForOneOnOne ? (
                <p className="person-brief__prep">Prepare for 1:1</p>
              ) : null}
            </div>
          </div>
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
                label="Period"
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

          {brief.newStarter ? (
            <p className="person-brief__note">{brief.newStarter.limitedHistoryNote}</p>
          ) : null}

          {brief.timeOff ? (
            <section className="person-brief__section">
              <h3 className="person-brief__section-title">Upcoming time off</h3>
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

          <section className="person-brief__section">
            <h3 className="person-brief__section-title">Recent performance</h3>
            <PersonAnalyticsMetricGrid
              metrics={brief.performanceKpis}
              className="performance-metrics performance-metrics--brief"
            />
            <PersonCycleTimeCard segments={brief.cycleTime} />
          </section>

          <section className="person-brief__section">
            <h3 className="person-brief__section-title">Current work</h3>
            <p className="person-brief__muted">
              {brief.currentWork.activeCount} active · {brief.currentWork.inReviewCount} in
              review · {brief.currentWork.problematicCount} at risk
            </p>
            <div className="person-brief__work-list">
              {brief.currentWork.topTasks.map((task) => (
                <PersonWorkRow
                  key={task.issueKey}
                  item={{
                    key: task.issueKey,
                    title: task.title,
                    status: task.status,
                    stageAge: task.stageAge,
                    healthVariant: "neutral",
                  }}
                />
              ))}
            </div>
          </section>

          <section className="person-brief__section">
            <h3 className="person-brief__section-title">Recently completed</h3>
            {brief.completedWork.length === 0 ? (
              <p className="person-brief__muted">No completed work in this period.</p>
            ) : (
              <div className="person-brief__history-list">
                {brief.completedWork.map((item) => (
                  <AnalyticsIssueRow
                    key={item.issueKey}
                    hidePerson
                    showOutcome
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
            )}
          </section>

          {brief.attention.length ? (
            <section className="person-brief__section">
              <h3 className="person-brief__section-title">Attention</h3>
              <ul className="person-brief__attention-list">
                {brief.attention.map((group) => (
                  <li key={`${group.label}-${group.reason}`} className="person-brief__attention-row">
                    <div>
                      <span className="person-brief__attention-label">{group.label}</span>
                      <span className="person-brief__muted">
                        {group.taskCount} task{group.taskCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <Badge variant={group.variant}>{group.reason}</Badge>
                    <span className="person-brief__muted person-brief__attention-keys">
                      {attentionIssuePreview(group)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {brief.feedbackLines.length ? (
            <section className="person-brief__section">
              <h3 className="person-brief__section-title">Feedback</h3>
              <ul className="person-brief__plain-list">
                {brief.feedbackLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {brief.resources.length ? (
            <section className="person-brief__section">
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
            <section className="person-brief__section person-brief__section--prompts">
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
