import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { SurveyQuestion } from '../../domain/survey/types';
import { Switch } from '../../components/Switch/Switch';
import { Input, SelectDropdown } from './design-system';
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
            <ChevronUp size={16} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="ds-feedback-question__icon-btn"
            disabled={disabled || !canMoveDown}
            aria-label="Move question down"
            onClick={onMoveDown}
          >
            <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
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
        <label className="ds-feedback-question__switch">
          <span>Enabled</span>
          <Switch
            checked={question.active}
            disabled={disabled}
            aria-label={`Question ${index + 1} enabled`}
            onCheckedChange={(v) => onChange({ active: v })}
          />
        </label>
        <label className="ds-feedback-question__switch">
          <span>Required</span>
          <Switch
            checked={question.required}
            disabled={disabled}
            aria-label={`Question ${index + 1} required`}
            onCheckedChange={(v) => onChange({ required: v })}
          />
        </label>
        <button
          type="button"
          className="ds-feedback-question__icon-btn ds-feedback-question__delete"
          disabled={disabled}
          aria-label="Delete question"
          onClick={onDelete}
        >
          <Trash2 size={16} strokeWidth={1.75} aria-hidden />
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
