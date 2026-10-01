import type { SurveyRecipient } from '../../domain/survey/types';
import {
  Checkbox,
  Drawer,
  Input,
  SelectDropdown,
  Status,
} from './design-system';
import { computeDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import { recipientStatusDisplay, recipientStatusTone } from './feedbackUi';

export function FeedbackRecipientsDrawer({
  open,
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
    <Drawer open={open} title="Recipients" onClose={onClose}>
      <div className="ds-feedback-recipients-summary">
        <Status tone="blue">{counts.selected} selected</Status>
        <Status tone="green">{counts.ready} ready</Status>
        {counts.missingEmail > 0 && (
          <Status tone="orange">{counts.missingEmail} missing email</Status>
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
              { value: 'no_email', label: 'No email' },
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
              <th>Source</th>
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
                <td>{r.emailSource}</td>
                <td>{r.issueKeys.length}</td>
                <td>
                  <Status tone={recipientStatusTone(r.status)} variant="tag">
                    {recipientStatusDisplay(r.status)}
                  </Status>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}
