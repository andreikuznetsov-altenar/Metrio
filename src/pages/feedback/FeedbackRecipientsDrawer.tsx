import type { SurveyRecipient } from '../../domain/survey/types';
import { Badge, Checkbox, Drawer, Input, SelectDropdown } from './design-system';
import { computeDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import {
  recipientStatusBadgeVariant,
  recipientStatusDisplay,
} from './feedbackUi';

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
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.reporterName.toLowerCase().includes(q) ||
      r.reporterEmail.toLowerCase().includes(q)
    );
  });

  return (
    <Drawer
      open={open}
      size="analytics"
      title={`Recipients · ${recipientCount}`}
      onClose={onClose}
    >
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
              { value: 'all', label: 'All' },
              { value: 'ready', label: 'Ready' },
              { value: 'no_email', label: 'Missing email' },
              { value: 'sent', label: 'Sent' },
              { value: 'responded', label: 'Responded' },
              { value: 'failed', label: 'Failed' },
            ]}
            onChange={onStatusFilterChange}
          />
        </div>
      </div>
      <div className="ds-feedback-recipients-table-wrap">
        <table className="ds-feedback-recipients-table">
          <thead>
            <tr>
              <th aria-label="Select" />
              <th>Name</th>
              <th>Email</th>
              <th>Tasks</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
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
                <td>{r.issueKeys.length}</td>
                <td>
                  <Badge variant={recipientStatusBadgeVariant(r.status)}>
                    {recipientStatusDisplay(r.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}
