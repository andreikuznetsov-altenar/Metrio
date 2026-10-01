import type { SurveyConfigDefaults, SurveyQuestion } from './types';

function q(
  id: string,
  type: SurveyQuestion['type'],
  title: string,
  options = '',
  helpText = '',
): SurveyQuestion {
  return {
    id,
    googleQuestionId: null,
    active: false,
    type,
    title,
    options,
    helpText,
    required: false,
  };
}

/** Empty first-run configuration — questions must be configured by the user. */
export const EMPTY_SURVEY_DEFAULTS: SurveyConfigDefaults = {
  title: 'Design Team Collaboration Feedback',
  emailSubject: 'Feedback on collaboration with the Design Team',
  introText:
    'We are collecting short feedback on collaboration with the Design Team to better understand what works well and where we can improve.',
  buttonLabel: 'Open feedback form',
  signature: 'Thank you for your time and feedback.',
  emailCollectionMode: 'RESPONDER_INPUT',
  responseAccess: 'anyone_with_link',
  questions: [
    q('q1', 'scale', '', '1|5', ''),
    q('q2', 'paragraph', '', '', ''),
    q('q3', 'multiple', '', 'Yes|No|Don\'t know', ''),
    q('q4', 'text', '', '', ''),
  ],
};

export function createDefaultSurveyData(): SurveyConfigDefaults {
  return JSON.parse(JSON.stringify(EMPTY_SURVEY_DEFAULTS));
}
