import type { FeedbackSurveyTemplate } from './feedbackCycleTypes';

export const BUILTIN_FEEDBACK_TEMPLATES: FeedbackSurveyTemplate[] = [
  {
    id: 'tpl_team_pulse',
    category: 'team',
    name: 'Team pulse',
    version: 1,
    description: 'Short recurring team check-in.',
    defaults: {
      title: 'Team pulse',
      emailSubject: 'Quick team pulse',
      introText: 'Please share your feedback for this period.',
      buttonLabel: 'Open survey',
      signature: '',
    },
    questions: [
      {
        questionKey: 'pulse_overall',
        type: 'scale',
        title: 'How is delivery going this period?',
        options: '1,5',
        helpText: '1 = blocked, 5 = smooth',
        required: true,
        active: true,
      },
      {
        questionKey: 'pulse_blockers',
        type: 'paragraph',
        title: 'What should we discuss?',
        options: '',
        helpText: '',
        required: false,
        active: true,
      },
    ],
  },
  {
    id: 'tpl_onboarding_30',
    category: 'onboarding',
    name: 'New starter — 30 day',
    version: 1,
    description: 'Onboarding feedback for the new starter.',
    defaults: {
      title: '30-day onboarding check-in',
      emailSubject: 'Your onboarding feedback',
      introText: 'Help us improve your onboarding experience.',
      buttonLabel: 'Share feedback',
      signature: '',
    },
    questions: [
      {
        questionKey: 'onboard_clarity',
        type: 'scale',
        title: 'How clear are your goals and expectations?',
        options: '1,5',
        helpText: '',
        required: true,
        active: true,
      },
      {
        questionKey: 'onboard_support',
        type: 'paragraph',
        title: 'What support would help?',
        options: '',
        helpText: '',
        required: false,
        active: true,
      },
    ],
  },
  {
    id: 'tpl_project_retro',
    category: 'project',
    name: 'Project retrospective',
    version: 1,
    defaults: {
      title: 'Project retrospective',
      emailSubject: 'Project feedback',
      introText: 'Share factual feedback about this project phase.',
      buttonLabel: 'Open survey',
      signature: '',
    },
    questions: [
      {
        questionKey: 'retro_working',
        type: 'paragraph',
        title: 'What worked well?',
        options: '',
        helpText: '',
        required: false,
        active: true,
      },
      {
        questionKey: 'retro_improve',
        type: 'paragraph',
        title: 'What should we adjust?',
        options: '',
        helpText: '',
        required: false,
        active: true,
      },
    ],
  },
  {
    id: 'tpl_manager_checkin',
    category: 'team',
    name: 'Manager check-in',
    version: 1,
    defaults: {
      title: 'Manager check-in',
      emailSubject: 'Feedback check-in',
      introText: 'A short check-in — not a performance rating.',
      buttonLabel: 'Respond',
      signature: '',
    },
    questions: [
      {
        questionKey: 'mgr_priorities',
        type: 'paragraph',
        title: 'What should we focus on next?',
        options: '',
        helpText: '',
        required: false,
        active: true,
      },
    ],
  },
];

export function getTemplateById(
  templates: FeedbackSurveyTemplate[],
  id: string,
): FeedbackSurveyTemplate | undefined {
  return templates.find((t) => t.id === id);
}
