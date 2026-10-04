import { useMemo } from "react";
import type { SurveyRecipient } from "../../domain/survey/types";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import { Badge, Checkbox, Drawer, Input, SelectDropdown } from "./design-system";
import { computeDeliveryCounts } from "../../domain/survey/deliveryMetrics";
import {
  recipientStatusBadgeVariant,
  recipientStatusDisplay,
} from "./feedbackUi";

const RECIPIENT_COLUMNS = [
  { id: "selected", type: "boolean" as const },
  { id: "name", type: "text" as const },
  { id: "email", type: "text" as const },
  { id: "tasks", type: "number" as const },
  {
    id: "status",
    type: "status" as const,
    statusKind: "feedbackRecipient" as const,
  },
];

export function FeedbackRecipientsDrawer({
  open,
  recipientCount,
  recipients,
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onClose,
  onToggleRecipient,
  onEmailChange,
}: {
  open: boolean;
  recipientCount: number;
  recipients: SurveyRecipient[];
  search: string;
  statusFilter: string;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onClose: () => void;
  onToggleRecipient: (recipientId: string, selected: boolean) => void;
  onEmailChange: (recipientId: string, email: string) => void;
}) {
  const counts = computeDeliveryCounts(recipients);
  const filtered = recipients.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.reporterName.toLowerCase().includes(q) ||
      r.reporterEmail.toLowerCase().includes(q)
    );
  });

  const getValue = useMemo(
    () => (row: SurveyRecipient, columnId: string) => {
      switch (columnId) {
        case "selected":
          return row.selected;
        case "name":
          return row.reporterName;
        case "email":
          return row.reporterEmail.trim() ? row.reporterEmail : null;
        case "tasks":
          return row.issueKeys.length;
        case "status":
          return recipientStatusDisplay(row.status);
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(
    filtered,
    RECIPIENT_COLUMNS,
    getValue,
  );

  return (
    <Drawer
      open={open}
      size="analytics"
      title={`Recipients · ${recipientCount}`}
      onClose={onClose}
    >
      <div className="ds-feedback-recipients" data-testid="feedback-recipients-drawer">
        <div className="ds-feedback-recipients-summary">
          <Badge variant="info">{counts.selected} selected</Badge>
          <Badge variant="success">{counts.ready} ready</Badge>
          {counts.missingEmail > 0 && (
            <Badge variant="warning">{counts.missingEmail} missing email</Badge>
          )}
        </div>
        <div className="ds-filter-row ds-filter-row--embedded ds-feedback-recipients-filters">
          <div className="ds-filter-row__grid ds-filter-row__grid--two">
            <Input label="Search" value={search} onChange={(e) => onSearchChange(e.target.value)} />
            <SelectDropdown
              label="Status"
              value={statusFilter}
              options={[
                { value: "all", label: "All" },
                { value: "ready", label: "Ready" },
                { value: "no_email", label: "Missing email" },
                { value: "sent", label: "Sent" },
                { value: "responded", label: "Responded" },
                { value: "failed", label: "Failed" },
              ]}
              onChange={onStatusFilterChange}
            />
          </div>
        </div>
        <MetrioTableWrap>
          <table className={METRIO_TABLE_CLASS}>
            <thead>
              <tr>
                <SortableTableHeader
                  columnId="selected"
                  label="Select"
                  sort={sort}
                  onToggle={toggleSort}
                />
                <SortableTableHeader columnId="name" label="Name" sort={sort} onToggle={toggleSort} />
                <SortableTableHeader columnId="email" label="Email" sort={sort} onToggle={toggleSort} />
                <SortableTableHeader
                  columnId="tasks"
                  label="Tasks"
                  sort={sort}
                  onToggle={toggleSort}
                  className="performance-table__num"
                  align="right"
                />
                <SortableTableHeader columnId="status" label="Status" sort={sort} onToggle={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Checkbox
                      label=""
                      checked={r.selected}
                      onChange={(checked) => onToggleRecipient(r.id, checked)}
                    />
                  </td>
                  <td>{r.reporterName}</td>
                  <td>
                    <Input
                      value={r.reporterEmail}
                      onChange={(e) => onEmailChange(r.id, e.target.value)}
                    />
                  </td>
                  <td className="performance-table__num">{r.issueKeys.length}</td>
                  <td>
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
    </Drawer>
  );
}
