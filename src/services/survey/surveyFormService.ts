import { applyGoogleQuestionIds } from '../../domain/survey/questionMapping';
import { buildFormsBatchRequests } from '../../domain/survey/formsRequests';
import type { Survey, SurveyConfigDefaults } from '../../domain/survey/types';
import type { SurveyGoogleClient } from './surveyGoogleClient';

export async function ensureGoogleFormForSurvey(
  client: SurveyGoogleClient,
  survey: Survey,
  defaults: SurveyConfigDefaults,
  regenerate = false,
): Promise<Survey> {
  let next = { ...survey };

  if (client.createSurveyForm) {
    if (regenerate && next.googleFormId && client.trashForm) {
      await client.trashForm(next.googleFormId);
    }
    if (!next.googleFormId || regenerate) {
      const created = await client.createSurveyForm(next, defaults);
      return {
        ...next,
        googleFormId: created.formId,
        responderUri: created.responderUri,
        questions: created.questions,
        questionsLocked: true,
        status: 'ready',
        error: null,
      };
    }
    return {
      ...next,
      status: 'ready',
      error: null,
    };
  }

  if (next.googleFormId && !regenerate) {
    if (!next.questionsLocked) {
      await client.updateForm(next.googleFormId, [
        {
          updateFormInfo: {
            info: { description: next.introText },
            updateMask: 'description',
          },
        },
      ]);
    }
  } else {
    const created = await client.createForm(next.title);
    const { requests, mappings } = buildFormsBatchRequests(next.questions);
    const batchRequests = [
      {
        updateFormInfo: {
          info: { description: next.introText },
          updateMask: 'description',
        },
      },
      ...requests,
    ];
    const batchResponse = await client.updateForm(created.formId, batchRequests);
    next = {
      ...next,
      googleFormId: created.formId,
      responderUri: created.responderUri,
      questions: applyGoogleQuestionIds(next.questions, batchResponse, mappings),
      questionsLocked: true,
    };
  }

  await client.publishForm(
    next.googleFormId!,
    defaults.emailCollectionMode,
    true,
  );

  await client.setResponderAccess(
    next.googleFormId!,
    defaults.responseAccess === 'anyone_with_link' ? 'anyone_with_link' : 'restricted',
  );

  return {
    ...next,
    status: 'ready',
    error: null,
  };
}

export async function regenerateGoogleFormForSurvey(
  client: SurveyGoogleClient,
  survey: Survey,
  defaults: SurveyConfigDefaults,
): Promise<Survey> {
  const freshQuestions = survey.questions.map((q) => ({
    ...q,
    googleQuestionId: null,
  }));
  const base = {
    ...survey,
    googleFormId: null,
    responderUri: null,
    questions: freshQuestions,
    questionsLocked: false,
  };
  return ensureGoogleFormForSurvey(client, base, defaults, true);
}
