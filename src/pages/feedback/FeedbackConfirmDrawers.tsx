import { Button, Drawer } from './design-system';

export function FeedbackSendConfirmDrawer({
  open,
  selectedCount,
  missingEmailCount,
  alreadySentCount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  selectedCount: number;
  missingEmailCount: number;
  alreadySentCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const skipped = missingEmailCount + alreadySentCount;
  return (
    <Drawer
      open={open}
      size="notification"
      title="Send surveys?"
      onClose={onClose}
      footer={
        <div className="ds-feedback-drawer-footer">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>
            {selectedCount === 1 ? 'Send 1 survey' : `Send ${selectedCount} surveys`}
          </Button>
        </div>
      }
    >
      <p>
        {selectedCount} selected {selectedCount === 1 ? 'recipient will' : 'recipients will'} receive an email.
      </p>
      {missingEmailCount > 0 && (
        <p>{missingEmailCount} {missingEmailCount === 1 ? 'recipient' : 'recipients'} without email will be skipped.</p>
      )}
      {alreadySentCount > 0 && skipped > missingEmailCount && (
        <p className="ds-feedback-connect__hint">
          Already sent or responded recipients are not included in this batch.
        </p>
      )}
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
      size="notification"
      title="Send reminders?"
      onClose={onClose}
      footer={
        <div className="ds-feedback-drawer-footer">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Send reminders</Button>
        </div>
      }
    >
      <p>
        {reminderCount} {reminderCount === 1 ? 'recipient has' : 'recipients have'} not responded yet.
      </p>
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
      size="notification"
      title="Regenerate Google Form?"
      onClose={onClose}
      footer={
        <div className="ds-feedback-drawer-footer">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Regenerate form</Button>
        </div>
      }
    >
      <p>Creates a new Form for this survey. Previously sent links may still work.</p>
    </Drawer>
  );
}
