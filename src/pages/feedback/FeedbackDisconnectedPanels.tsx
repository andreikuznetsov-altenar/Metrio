import { BarChart3, FileSpreadsheet, History, Send } from 'lucide-react';
import { FeedbackEmptyState } from './FeedbackEmptyState';

export interface FeedbackGoogleDisconnectedActions {
  connecting?: boolean;
  onConnectGoogle: () => void;
  onOpenSetupInstructions: () => void;
}

export function FeedbackSurveyDisconnectedPanel({
  connecting,
  onConnectGoogle,
  onOpenSetupInstructions,
}: FeedbackGoogleDisconnectedActions) {
  return (
    <FeedbackEmptyState
      testId="feedback-survey-disconnected"
      icon={FileSpreadsheet}
      title="Connect Google to send surveys"
      description="Connect your Google account to create Forms, deliver surveys and track responses from Metrio."
      primary={{
        label: connecting ? 'Connecting…' : 'Connect Google',
        onClick: onConnectGoogle,
        disabled: connecting,
      }}
      secondary={{
        label: 'Setup instructions',
        onClick: onOpenSetupInstructions,
        variant: 'secondary',
      }}
    />
  );
}

export function FeedbackDeliveryDisconnectedPanel({
  connecting,
  onConnectGoogle,
  onOpenSetupInstructions,
}: FeedbackGoogleDisconnectedActions) {
  return (
    <FeedbackEmptyState
      testId="feedback-delivery-disconnected"
      icon={Send}
      title="Connect Google to manage survey delivery"
      description="Connect Google before sending surveys and tracking delivery status."
      primary={{
        label: connecting ? 'Connecting…' : 'Connect Google',
        onClick: onConnectGoogle,
        disabled: connecting,
      }}
      secondary={{
        label: 'Setup instructions',
        onClick: onOpenSetupInstructions,
        variant: 'secondary',
      }}
    />
  );
}

export function FeedbackResultsDisconnectedPanel({
  connecting,
  onConnectGoogle,
  onOpenSetupInstructions,
}: FeedbackGoogleDisconnectedActions) {
  return (
    <FeedbackEmptyState
      testId="feedback-results-disconnected"
      icon={BarChart3}
      title="Connect Google to view survey results"
      description="Response status and survey results become available after Google is connected."
      primary={{
        label: connecting ? 'Connecting…' : 'Connect Google',
        onClick: onConnectGoogle,
        disabled: connecting,
      }}
      secondary={{
        label: 'Setup instructions',
        onClick: onOpenSetupInstructions,
        variant: 'secondary',
      }}
    />
  );
}

export function FeedbackHistoryEmptyPanel() {
  return (
    <FeedbackEmptyState
      testId="feedback-history-empty"
      icon={History}
      title="No survey history yet"
      description="Prepared and sent surveys will appear here once you run your first survey."
    />
  );
}

export function FeedbackDeliveryNoSurveyPanel() {
  return (
    <FeedbackEmptyState
      testId="feedback-delivery-no-survey"
      icon={Send}
      title="Prepare a survey to track delivery"
      description="Use the Survey tab to prepare recipients and generate a Google Form before sending."
    />
  );
}

export function FeedbackResultsEmptyPanel() {
  return (
    <FeedbackEmptyState
      testId="feedback-results-empty"
      icon={BarChart3}
      title="No survey responses yet"
      description="Send a survey from Delivery, then refresh results after recipients respond."
    />
  );
}
