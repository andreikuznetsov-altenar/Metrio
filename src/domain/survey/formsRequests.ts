import type { CreateItemMappingInput } from './questionMapping';
import type { SurveyQuestion } from './types';

export interface FormsBatchBuildResult {
  requests: unknown[];
  mappings: CreateItemMappingInput[];
}

export function buildFormsBatchRequests(questions: SurveyQuestion[]): FormsBatchBuildResult {
  const requests: unknown[] = [];
  const mappings: CreateItemMappingInput[] = [];
  let index = 0;

  for (const q of questions.filter((x) => x.active && x.title.trim())) {
    mappings.push({ localQuestionId: q.id, requestIndex: index });

    if (q.type === 'scale') {
      const parts = String(q.options || '1|5')
        .split('|')
        .map((v) => Number(String(v).trim()));
      const low = Number(parts[0] || 1);
      const high = Number(parts[1] || 5);
      requests.push({
        createItem: {
          item: {
            title: q.title,
            questionItem: {
              question: {
                required: q.required,
                scaleQuestion: {
                  low,
                  high,
                  lowLabel: String(low),
                  highLabel: String(high),
                },
              },
            },
            description: q.helpText || undefined,
          },
          location: { index },
        },
      });
    } else if (q.type === 'paragraph') {
      requests.push({
        createItem: {
          item: {
            title: q.title,
            questionItem: {
              question: {
                required: q.required,
                textQuestion: { paragraph: true },
              },
            },
            description: q.helpText || undefined,
          },
          location: { index },
        },
      });
    } else if (q.type === 'multiple') {
      const options = String(q.options || '')
        .split('|')
        .map((v) => v.trim())
        .filter(Boolean)
        .map((value) => ({ value }));
      requests.push({
        createItem: {
          item: {
            title: q.title,
            questionItem: {
              question: {
                required: q.required,
                choiceQuestion: {
                  type: 'RADIO',
                  options,
                },
              },
            },
            description: q.helpText || undefined,
          },
          location: { index },
        },
      });
    } else {
      requests.push({
        createItem: {
          item: {
            title: q.title,
            questionItem: {
              question: {
                required: q.required,
                textQuestion: { paragraph: false },
              },
            },
            description: q.helpText || undefined,
          },
          location: { index },
        },
      });
    }
    index += 1;
  }

  return { requests, mappings };
}
