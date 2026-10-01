import { resolveLocalQuestion } from './questionMapping';
import type { SurveyQuestion, SurveyResponse, SurveyResponseAnswer } from './types';

function answerText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.textAnswers)) {
      return v.textAnswers.map((t) => String((t as { value?: string }).value || '')).join(', ');
    }
    if (v.value !== undefined) return String(v.value);
  }
  return String(value);
}

export function extractRespondentEmail(raw: Record<string, unknown>): string {
  return String(raw.respondentEmail || '').trim();
}

export function mapGoogleFormResponse(
  raw: Record<string, unknown>,
  questions: SurveyQuestion[],
): SurveyResponse {
  const answers: SurveyResponseAnswer[] = [];
  const answerMap = (raw.answers || {}) as Record<string, Record<string, unknown>>;

  for (const [googleQuestionId, payload] of Object.entries(answerMap)) {
    const question = resolveLocalQuestion(googleQuestionId, questions);
    answers.push({
      questionId: question?.id || googleQuestionId,
      googleQuestionId,
      questionTitle: question?.title || googleQuestionId,
      value: answerText(payload),
    });
  }

  return {
    responseId: String(raw.responseId || ''),
    createTime: String(raw.createTime || ''),
    lastSubmittedTime: String(raw.lastSubmittedTime || raw.createTime || ''),
    answers,
  };
}

export function mergeResponses(
  existing: SurveyResponse[],
  incoming: SurveyResponse[],
): SurveyResponse[] {
  const byId = new Map(existing.map((r) => [r.responseId, r]));
  for (const response of incoming) {
    if (!response.responseId) continue;
    byId.set(response.responseId, response);
  }
  return [...byId.values()].sort((a, b) =>
    a.lastSubmittedTime.localeCompare(b.lastSubmittedTime),
  );
}

export function isEmptyResponse(response: SurveyResponse): boolean {
  return !response.answers.some((a) => String(a.value || '').trim());
}

export function matchResponseToRecipient(
  _response: SurveyResponse,
  respondentEmail: string,
  recipientEmail: string,
): boolean {
  if (!respondentEmail || !recipientEmail) return false;
  return respondentEmail.trim().toLowerCase() === recipientEmail.trim().toLowerCase();
}

export function responseSubmittedAt(raw: Record<string, unknown>): string {
  const submitted = String(raw.lastSubmittedTime || raw.createTime || '');
  return submitted || new Date().toISOString();
}
