import { FileSpreadsheet } from 'lucide-react';
import { Button } from './design-system';
import '../performance/goal-detail-drawer.css';
import './feedback-disconnected.css';

export interface FeedbackSurveyDisconnectedProps {
  onConnectGoogle: () => void;
  onOpenSetupInstructions: () => void;
  connecting?: boolean;
}

export function FeedbackSurveyDisconnected({
  onConnectGoogle,
  onOpenSetupInstructions,
  connecting = false,
}: FeedbackSurveyDisconnectedProps) {
  return (
    <div
      className="feedback-survey-disconnected goals-empty-state goals-empty-state--centered"
      data-testid="feedback-survey-disconnected"
    >
      <FileSpreadsheet
        className="goals-empty-state__icon"
        size={28}
        strokeWidth={1.5}
        aria-hidden
      />
      <h3 className="goals-empty-state__title">Connect Google to create and send surveys</h3>
      <p className="goals-empty-state__body">
        Metrio uses your Google connection to create forms, deliver surveys and collect response
        status.
      </p>
      <div className="feedback-survey-disconnected__actions">
        <Button disabled={connecting} onClick={onConnectGoogle}>
          {connecting ? 'Connecting…' : 'Connect Google'}
        </Button>
        <Button variant="secondary" onClick={onOpenSetupInstructions}>
          Setup instructions
        </Button>
      </div>
    </div>
  );
}
