import { useMemo } from "react";
import type { Survey } from "../../domain/survey/types";
import { computeDeliveryCounts } from "../../domain/survey/deliveryMetrics";
import { surveyStatusLabel } from "../../domain/survey/status";
import { formatPerformanceDateRangeDisplay } from "../../domain/performance/performanceDateRange";
import { Badge } from "../../components/Badge/Badge";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import { FeedbackHistoryEmptyPanel } from "./FeedbackDisconnectedPanels";

type HistoryRow = {
  survey: Survey;
  counts: ReturnType<typeof computeDeliveryCounts>;
};

const HISTORY_COLUMNS = [
  { id: "title", type: "text" as const },
  { id: "period", type: "date" as const },
  { id: "sent", type: "number" as const },
  { id: "responses", type: "number" as const },
  { id: "rate", type: "number" as const },
  { id: "status", type: "status" as const },
  { id: "state", type: "text" as const },
];

export function FeedbackHistoryView({
  surveys,
  activeSurveyId,
  onSelectSurvey,
}: {
  surveys: Survey[];
  activeSurveyId: string | null;
  onSelectSurvey: (id: string) => void;
}) {
  const rows = useMemo<HistoryRow[]>(
    () =>
      surveys.map((survey) => ({
        survey,
        counts: computeDeliveryCounts(survey.recipients),
      })),
    [surveys],
  );

  const getValue = useMemo(
    () => (row: HistoryRow, columnId: string) => {
      const { survey, counts } = row;
      switch (columnId) {
        case "title":
          return survey.title;
        case "period":
          return survey.dateFrom;
        case "sent":
          return counts.delivered;
        case "responses":
          return counts.responded;
        case "rate":
          return counts.responseRatePercent;
        case "status":
          return surveyStatusLabel(survey.status);
        case "state":
          return survey.id === activeSurveyId ? "Active" : "";
        default:
          return "";
      }
    },
    [activeSurveyId],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(rows, HISTORY_COLUMNS, getValue);

  if (surveys.length === 0) {
    return <FeedbackHistoryEmptyPanel />;
  }

  return (
    <section aria-label="Survey history" data-testid="feedback-history-table">
      <MetrioTableWrap>
        <table className={METRIO_TABLE_CLASS}>
          <thead>
            <tr>
              <SortableTableHeader columnId="title" label="Survey" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader columnId="period" label="Period" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader
                columnId="sent"
                label="Sent"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"

              />
              <SortableTableHeader
                columnId="responses"
                label="Responses"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"

              />
              <SortableTableHeader
                columnId="rate"
                label="Response rate"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"

              />
              <SortableTableHeader columnId="status" label="Status" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader columnId="state" label="State" sort={sort} onToggle={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ survey, counts }) => {
              const selected = survey.id === activeSurveyId;
              return (
                <tr
                  key={survey.id}
                  className={[
                    "performance-table__clickable-row",
                    selected ? "performance-table__row--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onSelectSurvey(survey.id)}
                >
                  <td>
                    <span className="performance-table__person-name">{survey.title}</span>
                  </td>
                  <td>
                    {formatPerformanceDateRangeDisplay(survey.dateFrom, survey.dateTo)}
                  </td>
                  <td className="performance-table__num">{counts.delivered}</td>
                  <td className="performance-table__num">{counts.responded}</td>
                  <td className="performance-table__num">{counts.responseRatePercent}%</td>
                  <td>
                    <Badge variant={survey.status === "active" ? "info" : "neutral"}>
                      {surveyStatusLabel(survey.status)}
                    </Badge>
                  </td>
                  <td>
                    {selected ? <Badge variant="accent">Active</Badge> : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </MetrioTableWrap>
    </section>
  );
}
