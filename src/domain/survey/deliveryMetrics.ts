import type { SurveyRecipient } from './types';

export interface SurveyDeliveryCounts {
  recipients: number;
  selected: number;
  delivered: number;
  responded: number;
  waiting: number;
  failed: number;
  missingEmail: number;
  ready: number;
  responseRatePercent: number;
}

/**
 * Delivery metrics semantics:
 * - Delivered = successfully sent email (Sent + Responded)
 * - Waiting = delivered but not yet responded
 * - Response rate = responded / delivered (not all discovered recipients)
 */
export function computeDeliveryCounts(recipients: SurveyRecipient[]): SurveyDeliveryCounts {
  const selected = recipients.filter((r) => r.selected).length;
  const responded = recipients.filter((r) => r.status === 'responded').length;
  const sentOnly = recipients.filter((r) => r.status === 'sent').length;
  const delivered = sentOnly + responded;
  const waiting = sentOnly;
  const failed = recipients.filter((r) => r.status === 'failed').length;
  const missingEmail = recipients.filter((r) => r.status === 'no_email' || !r.reporterEmail).length;
  const ready = recipients.filter((r) => r.status === 'ready' && r.reporterEmail).length;
  const responseRatePercent = delivered
    ? Math.round((responded / delivered) * 10000) / 100
    : 0;

  return {
    recipients: recipients.length,
    selected,
    delivered,
    responded,
    waiting,
    failed,
    missingEmail,
    ready,
    responseRatePercent,
  };
}
