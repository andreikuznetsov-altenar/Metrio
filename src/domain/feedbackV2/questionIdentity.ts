import type { SurveyQuestion } from '../survey/types';

export function semanticQuestionKey(question: Pick<SurveyQuestion, 'type' | 'title'>): string {
  return `${question.type}::${question.title.trim().toLowerCase()}`;
}

export function createQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Repeat keeps stable Metrio question IDs when semantics match. */
export function stabilizeQuestionsForRepeat(
  previous: SurveyQuestion[],
  next: SurveyQuestion[],
): SurveyQuestion[] {
  const idBySemantic = new Map(previous.map((q) => [semanticQuestionKey(q), q.id]));
  const usedIds = new Set<string>();

  return next.map((question) => {
    const semantic = semanticQuestionKey(question);
    const inheritedId = idBySemantic.get(semantic);
    if (inheritedId && !usedIds.has(inheritedId)) {
      usedIds.add(inheritedId);
      return { ...question, id: inheritedId, googleQuestionId: null };
    }
    if (previous.some((p) => p.id === question.id) && !usedIds.has(question.id)) {
      usedIds.add(question.id);
      return { ...question, googleQuestionId: null };
    }
    const id = createQuestionId();
    usedIds.add(id);
    return { ...question, id, googleQuestionId: null };
  });
}

export function assignQuestionIds(questions: SurveyQuestion[]): SurveyQuestion[] {
  return questions.map((q) => ({
    ...q,
    id: q.id?.trim() ? q.id : createQuestionId(),
    googleQuestionId: null,
  }));
}
