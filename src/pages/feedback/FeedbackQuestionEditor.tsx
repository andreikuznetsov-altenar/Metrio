import type { SurveyQuestion } from '../../domain/survey/types';
import { Checkbox, Icon, Input, SelectDropdown } from './design-system';
import { questionTypeLabel } from './feedbackUi';

export function FeedbackQuestionEditor({
  index,
  question,
  disabled,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  index: number;
  question: SurveyQuestion;
  disabled?: boolean;
  onChange: (patch: Partial<SurveyQuestion>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const showOptions = question.type === 'scale' || question.type === 'multiple';

  return (
    <article className="ds-feedback-question">
      <header className="ds-feedback-question__header">
        <div className="ds-feedback-question__reorder">
          <button
            type="button"
            className="ds-feedback-question__icon-btn"
            disabled={disabled || !canMoveUp}
            aria-label="Move question up"
            onClick={onMoveUp}
          >
            <Icon name="up" size={16} />
          </button>
          <button
            type="button"
            className="ds-feedback-question__icon-btn"
            disabled={disabled || !canMoveDown}
            aria-label="Move question down"
            onClick={onMoveDown}
          >
            <Icon name="down" size={16} />
          </button>
        </div>
        <span className="ds-feedback-question__number">Q{index + 1}</span>
        <SelectDropdown
          value={question.type}
          options={[
            { value: 'scale', label: questionTypeLabel('scale') },
            { value: 'paragraph', label: questionTypeLabel('paragraph') },
            { value: 'multiple', label: questionTypeLabel('multiple') },
            { value: 'text', label: questionTypeLabel('text') },
          ]}
          onChange={(v) => onChange({ type: v as SurveyQuestion['type'] })}
        />
        <Checkbox
          label="Active"
          checked={question.active}
          disabled={disabled}
          onChange={(v) => onChange({ active: v })}
        />
        <Checkbox
          label="Required"
          checked={question.required}
          disabled={disabled}
          onChange={(v) => onChange({ required: v })}
        />
        <button
          type="button"
          className="ds-feedback-question__icon-btn ds-feedback-question__delete"
          disabled={disabled}
          aria-label="Delete question"
          onClick={onDelete}
        >
          ×
        </button>
      </header>
      <div className="ds-feedback-question__body">
        <Input
          label="Question"
          value={question.title}
          disabled={disabled}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        {showOptions && (
          <Input
            label={question.type === 'scale' ? 'Scale (min|max)' : 'Options'}
            value={question.options}
            disabled={disabled}
            onChange={(e) => onChange({ options: e.target.value })}
            placeholder={question.type === 'scale' ? '1|5' : 'Yes|No'}
          />
        )}
        <Input
          label="Help text"
          value={question.helpText}
          disabled={disabled}
          onChange={(e) => onChange({ helpText: e.target.value })}
        />
      </div>
    </article>
  );
}
