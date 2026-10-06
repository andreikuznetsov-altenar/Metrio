import { useEffect, useState } from "react";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { PersonCycleTimeCard } from "../../components/PersonCycleTimeCard/PersonCycleTimeCard";
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
import { exportPerformancePdf } from "../../services/export/pdfExport";
import { useToast } from "../../components/Toast/ToastContext";
import { PersonAnalyticsMetricGrid } from "./PersonAnalyticsMetricGrid";
import { PersonWorkRow } from "./PersonWorkRow";
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

export function PersonBriefDrawerPanel({
  personId,
  prepForOneOnOne = false,
}: {
  personId: string;
  prepForOneOnOne?: boolean;
}) {
  const { currentUser } = useCurrentUser();
  const { data } = usePerformanceData();
  const surveyData = useFeedbackSurveyStore((state) => state.data);
  const graph = useWorkGraph();
  const { success: toastSuccess, error: toastError } = useToast();
  const [periodPreset, setPeriodPreset] = useState<DateRangeKey>("30d");
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, [personId]);

  if (!canOpenPersonBrief(currentUser, personId)) {
    return null;
  }

  const knowledgeLinks = [
    ...graph.knowledgeByIssue.values(),
    ...graph.knowledgeByProject.values(),
  ].flat();

  const brief = usePersonBriefModel({
    personId,
    periodPreset,
    data,
    selfPersonId: currentUser.person.id,
    surveyData,
    knowledgeLinks,
    jiraBaseUrl,
  });

  void prepForOneOnOne;

  const handleCopy = async () => {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(formatPersonBriefPlainText(brief));
      toastSuccess("Brief copied");
    } catch {
      toastError("Could not copy brief");
    }
  };

  const handleExport = async () => {
    if (!brief) return;
    const result = await exportPerformancePdf(buildPersonBriefPdfPayload(brief));
    if (result.status === "saved") toastSuccess("Brief exported");
    else if (result.status === "error") toastError(result.userMessage);
  };

  if (!brief) {
    return (
      <p className="person-brief__empty" role="status">
        Brief is not available yet.
      </p>
    );
  }

  return (
    <div className="person-brief__body" data-testid="person-brief-drawer">
      <div className="person-brief__toolbar">
        <div className="person-brief__period">
          <Select
            aria-label="Brief period"
            value={periodPreset}
            options={PERIOD_OPTIONS}
            onChange={(event) => setPeriodPreset(event.target.value as DateRangeKey)}
          />
        </div>
        <div className="person-brief__actions">
          <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
            Copy brief
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
          <div className="person-brief__work-list">
            {brief.currentWork.topTasks.map((task) => (
              <PersonWorkRow key={task.key} item={task} variant="inline" jiraBaseUrl={jiraBaseUrl} />
            ))}
          </div>
        </section>
      ) : null}
      {brief.completedWork.length > 0 ? (
        <section className="person-brief__section-card">
          <h3 className="person-brief__section-title">Recently completed</h3>
          <div className="person-brief__work-list">
            {brief.completedWork.map((item) => (
              <PersonWorkRow
                key={item.issueKey}
                item={{
                  key: item.issueKey,
                  title: item.title,
                  status: item.metaLine,
                  stageAge: "—",
                  healthVariant: "neutral",
                }}
                variant="inline"
                jiraBaseUrl={jiraBaseUrl}
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
      <p className="person-brief__footer-note">{brief.generatedNote}</p>
    </div>
  );
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
  const { data, viewModels } = usePerformanceData();
  const surveyData = useFeedbackSurveyStore((state) => state.data);
  const graph = useWorkGraph();
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
      <PersonBriefDrawerPanel personId={personId} prepForOneOnOne={prepForOneOnOne} />
    </Drawer>
  );
}
