import type { SurveyQuestion } from './types';

export interface CreateItemMappingInput {
  localQuestionId: string;
  requestIndex: number;
}

function extractGoogleQuestionId(reply: Record<string, unknown>): string | null {
  const createItem = reply.createItem as Record<string, unknown> | undefined;
  if (!createItem) return null;

  const questionItem = createItem.questionItem as Record<string, unknown> | undefined;
  const question = questionItem?.question as Record<string, unknown> | undefined;
  const questionId = question?.questionId;
  return typeof questionId === 'string' && questionId ? questionId : null;
}

export function applyGoogleQuestionIds(
  questions: SurveyQuestion[],
  batchResponse: unknown,
  mappings: CreateItemMappingInput[],
): SurveyQuestion[] {
  const replies = (batchResponse as { replies?: unknown[] })?.replies || [];
  const googleIds: string[] = [];

  for (const reply of replies) {
    if (!reply || typeof reply !== 'object') continue;
    const googleQuestionId = extractGoogleQuestionId(reply as Record<string, unknown>);
    if (googleQuestionId) googleIds.push(googleQuestionId);
  }

  const localToGoogle = new Map<string, string | null>();
  for (let i = 0; i < mappings.length; i++) {
    localToGoogle.set(mappings[i].localQuestionId, googleIds[i] || null);
  }

  return questions.map((q) => ({
    ...q,
    googleQuestionId: localToGoogle.get(q.id) ?? q.googleQuestionId,
  }));
}

export function resolveLocalQuestion(
  googleQuestionId: string,
  questions: SurveyQuestion[],
): SurveyQuestion | undefined {
  const byGoogleId = questions.find((q) => q.googleQuestionId === googleQuestionId);
  if (byGoogleId) return byGoogleId;

  const byLocalId = questions.find((q) => q.id === googleQuestionId);
  if (byLocalId) return byLocalId;

  return questions.find((q) => q.title.trim() && q.title === googleQuestionId);
}
