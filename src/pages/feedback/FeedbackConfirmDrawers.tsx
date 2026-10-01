import { Button, Drawer } from './design-system';

export function FeedbackSendConfirmDrawer({
  open,
  selectedCount,
  missingEmailCount,
  alreadySentCount,
  accountEmail,
  onClose,
  onConfirm,
}: {
  open: boolean;
  selectedCount: number;
  missingEmailCount: number;
  alreadySentCount: number;
  accountEmail: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Drawer
      open={open}
      title="Send survey?"
      onClose={onClose}
      footer={
        <div className="ds-feedback-drawer-footer">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Send survey</Button>
        </div>
      }
    >
      <p>Recipients: {selectedCount}</p>
      <p>Missing email: {missingEmailCount}</p>
      <p>Already sent: {alreadySentCount}</p>
      <p className="ds-feedback-connect__hint">
        {selectedCount} emails will be sent from {accountEmail || 'your connected Google account'}.
      </p>
    </Drawer>
  );
}

export function FeedbackReminderConfirmDrawer({
  open,
  reminderCount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  reminderCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Drawer
      open={open}
      title="Send reminders?"
      onClose={onClose}
      footer={
        <div className="ds-feedback-drawer-footer">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Send reminder</Button>
        </div>
      }
    >
      <p>Send reminder to {reminderCount} recipients?</p>
    </Drawer>
  );
}

export function FeedbackRegenerateConfirmDrawer({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Drawer
      open={open}
      title="Regenerate Google Form?"
      onClose={onClose}
      footer={
        <div className="ds-feedback-drawer-footer">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Regenerate form</Button>
        </div>
      }
    >
      <p>
        Regenerating creates a new Google Form and may invalidate the current form link.
        Previously sent links may remain valid.
      </p>
    </Drawer>
  );
}
