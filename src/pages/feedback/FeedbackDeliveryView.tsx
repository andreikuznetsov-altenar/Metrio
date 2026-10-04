import { useMemo } from "react";
import type { SurveyDeliveryCounts } from "../../domain/survey/deliveryMetrics";
import type { SurveyRecipient } from "../../domain/survey/types";
import { METRIO_TABLE_CLASS, MetrioTableWrap, TableClampCell } from "../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import { Badge, Button, Section } from "./design-system";
import {
  recipientStatusBadgeVariant,
  recipientStatusDisplay,
} from "./feedbackUi";

const DELIVERY_COLUMNS = [
  { id: "name", type: "text" as const },
  { id: "tasks", type: "number" as const },
  { id: "email", type: "text" as const },
  { id: "status", type: "status" as const },
];

export function FeedbackDeliveryView({
  recipients,
  counts,
  reminderCount,
  failedCount,
  selectedSendCount,
  sendDisabled,
  onReviewRecipients,
  onSendReminder,
  onSendSurveys,
}: {
  recipients: SurveyRecipient[];
  counts: SurveyDeliveryCounts;
  reminderCount: number;
  failedCount: number;
  selectedSendCount: number;
  sendDisabled?: boolean;
  onReviewRecipients: () => void;
  onSendReminder: () => void;
  onSendSurveys: () => void;
}) {
  const sentCount = recipients.filter((r) => r.status === "sent").length;

  const getValue = useMemo(
    () => (row: SurveyRecipient, columnId: string) => {
      switch (columnId) {
        case "name":
          return row.reporterName;
        case "tasks":
          return row.issueKeys.length;
        case "email":
          return row.reporterEmail;
        case "status":
          return recipientStatusDisplay(row.status);
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(
    recipients,
    DELIVERY_COLUMNS,
    getValue,
  );

  return (
    <Section title="Delivery" subtitle="Send surveys and track delivery" variant="plain">
      <div className="feedback-surface-card feedback-surface-card--stack">
        <div className="ds-feedback-delivery-stats">
          <div className="ds-feedback-stat">
            <span className="ds-feedback-stat__label">Recipients</span>
            <span className="ds-feedback-stat__value">{counts.recipients}</span>
          </div>
          <div className="ds-feedback-stat">
            <span className="ds-feedback-stat__label">Ready</span>
            <span className="ds-feedback-stat__value">{counts.ready}</span>
          </div>
          <div className="ds-feedback-stat">
            <span className="ds-feedback-stat__label">Missing email</span>
            <span className="ds-feedback-stat__value">{counts.missingEmail}</span>
          </div>
          <div className="ds-feedback-stat">
            <span className="ds-feedback-stat__label">Sent</span>
            <span className="ds-feedback-stat__value">{sentCount}</span>
          </div>
          <div className="ds-feedback-stat">
            <span className="ds-feedback-stat__label">Responded</span>
            <span className="ds-feedback-stat__value">{counts.responded}</span>
          </div>
        </div>

        <div className="ds-feedback-section-footer">
          <Button variant="secondary" size="small" onClick={onReviewRecipients}>
            Review recipients
          </Button>
          <Button
            variant="secondary"
            size="small"
            disabled={reminderCount === 0}
            onClick={onSendReminder}
          >
            Send reminders ({reminderCount})
          </Button>
          <Button size="small" disabled={sendDisabled} onClick={onSendSurveys}>
            Send surveys ({selectedSendCount})
          </Button>
          {failedCount > 0 && (
            <Button variant="secondary" size="small" disabled={sendDisabled} onClick={onSendSurveys}>
              Retry failed ({failedCount})
            </Button>
          )}
        </div>

        <MetrioTableWrap testId="feedback-delivery-table">
          <table className={METRIO_TABLE_CLASS}>
            <thead>
              <tr>
                <SortableTableHeader columnId="name" label="Recipient" sort={sort} onToggle={toggleSort} />
                <SortableTableHeader
                  columnId="tasks"
                  label="Tasks"
                  sort={sort}
                  onToggle={toggleSort}
                  className="performance-table__num"
                  align="right"
                />
                <SortableTableHeader columnId="email" label="Email" sort={sort} onToggle={toggleSort} />
                <SortableTableHeader
                  columnId="status"
                  label="Status"
                  sort={sort}
                  onToggle={toggleSort}
                  className="performance-table__action"
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.reporterName}</td>
                  <td className="performance-table__num">{r.issueKeys.length}</td>
                  <TableClampCell title={r.reporterEmail || undefined}>
                    {r.reporterEmail || "—"}
                  </TableClampCell>
                  <td className="performance-table__action">
                    <Badge variant={recipientStatusBadgeVariant(r.status)}>
                      {recipientStatusDisplay(r.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </MetrioTableWrap>
      </div>
    </Section>
  );
}
