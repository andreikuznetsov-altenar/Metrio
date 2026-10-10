import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Survey } from '../../domain/survey/types';
import { computeDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import { buildSurveyMetricsSummary } from '../../domain/survey/metrics';
import { deriveRunPhase } from '../../domain/feedbackV2/runStatus';
import { Button, StatusBanner } from './design-system';
import { FeedbackDeliveryView } from './FeedbackDeliveryView';
import { FeedbackResultsView } from './FeedbackResultsView';
import {
  FeedbackSendConfirmDrawer,
} from './FeedbackConfirmDrawers';

export function FeedbackRunWorkspace({
  run,
  loading,
  onSend,
  onSync,
  onStop,
  showSendConfirm,
  onShowSendConfirm,
}: {
  run: Survey;
  loading: boolean;
  onSend: () => Promise<void>;
  onSync: () => Promise<void>;
  onStop: () => Promise<void>;
  showSendConfirm: boolean;
  onShowSendConfirm: (open: boolean) => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const phase = deriveRunPhase(run);
  const counts = computeDeliveryCounts(run.recipients);
  const metrics = buildSurveyMetricsSummary(run.questions, run.responses);
  const sentCount = run.recipients.filter(
    (r) => r.selected && (r.status === 'sent' || r.status === 'responded'),
  ).length;

  const selectedSendCount = useMemo(
    () =>
      run.recipients.filter(
        (r) =>
          r.selected &&
          r.status !== 'sent' &&
          r.status !== 'responded' &&
          r.status !== 'sending' &&
          r.reporterEmail,
      ).length,
    [run.recipients],
  );

  const runSync = async () => {
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="feedback-run-workspace" data-testid="feedback-run-workspace">
      {phase === 'active' ? (
        <div className="feedback-cycle-detail__head">
          <Button type="button" variant="secondary" size="small" onClick={() => void onStop()}>
            Stop run
          </Button>
        </div>
      ) : null}

      {!run.responderUri ? (
        <StatusBanner tone="warning">Google Form is not ready yet.</StatusBanner>
      ) : null}

      {phase !== 'stopped' ? (
        <FeedbackDeliveryView
          recipients={run.recipients}
          counts={counts}
          reminderCount={0}
          failedCount={run.recipients.filter((r) => r.status === 'failed' && r.selected).length}
          selectedSendCount={selectedSendCount}
          sendDisabled={loading || !run.responderUri || selectedSendCount === 0}
          onReviewRecipients={() => undefined}
          onSendReminder={() => undefined}
          onSendSurveys={() => onShowSendConfirm(true)}
        />
      ) : null}

      <div className="feedback-run-workspace__results">
        <div className="feedback-run-workspace__results-head">
          <h3>Results</h3>
          <Button variant="secondary" size="small" disabled={syncing} onClick={() => void runSync()}>
            {syncing ? (
              <>
                <Loader2 size={14} className="feedback-btn-spinner" aria-hidden />
                Syncing...
              </>
            ) : (
              'Refresh responses'
            )}
          </Button>
        </div>
        <FeedbackResultsView metrics={metrics} sentCount={sentCount} title={null} />
      </div>

      <FeedbackSendConfirmDrawer
        open={showSendConfirm}
        selectedCount={selectedSendCount}
        missingEmailCount={counts.missingEmail}
        alreadySentCount={sentCount}
        onClose={() => onShowSendConfirm(false)}
        onConfirm={() => void onSend().then(() => onShowSendConfirm(false))}
      />
    </div>
  );
}
