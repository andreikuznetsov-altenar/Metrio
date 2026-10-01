import type { SurveyQuestion } from '../../domain/survey/types';
import { Button, Input, Section } from './design-system';
import { FeedbackQuestionEditor } from './FeedbackQuestionEditor';

export function FeedbackSurveyContent({
  title,
  emailSubject,
  introText,
  questions,
  editingDefaults,
  canEdit,
  questionsLocked,
  onTitleChange,
  onEmailSubjectChange,
  onIntroChange,
  onToggleMode,
  onQuestionChange,
  onQuestionDelete,
  onQuestionMove,
  onAddQuestion,
}: {
  title: string;
  emailSubject: string;
  introText: string;
  questions: SurveyQuestion[];
  editingDefaults: boolean;
  canEdit: boolean;
  questionsLocked?: boolean;
  onTitleChange: (v: string) => void;
  onEmailSubjectChange: (v: string) => void;
  onIntroChange: (v: string) => void;
  onToggleMode?: () => void;
  onQuestionChange: (index: number, patch: Partial<SurveyQuestion>) => void;
  onQuestionDelete: (index: number) => void;
  onQuestionMove: (index: number, direction: -1 | 1) => void;
  onAddQuestion: () => void;
}) {
  return (
    <Section
      title="Survey content"
      headerRight={
        onToggleMode ? (
          <Button variant="secondary" size="small" onClick={onToggleMode}>
            {editingDefaults ? 'Prepared survey' : 'Edit defaults'}
          </Button>
        ) : undefined
      }
    >
      <div className="ds-feedback-form-stack">
        <Input label="Survey title" value={title} disabled={!canEdit} onChange={(e) => onTitleChange(e.target.value)} />
        <Input
          label="Email subject"
          value={emailSubject}
          disabled={!canEdit}
          onChange={(e) => onEmailSubjectChange(e.target.value)}
        />
        <Input
          label="Intro text"
          value={introText}
          disabled={!canEdit}
          onChange={(e) => onIntroChange(e.target.value)}
        />
      </div>
      <div className="ds-feedback-questions">
        {questions.map((question, index) => (
          <FeedbackQuestionEditor
            key={question.id}
            index={index}
            question={question}
            disabled={!canEdit || questionsLocked}
            onChange={(patch) => onQuestionChange(index, patch)}
            onDelete={() => onQuestionDelete(index)}
            onMoveUp={() => onQuestionMove(index, -1)}
            onMoveDown={() => onQuestionMove(index, 1)}
            canMoveUp={index > 0}
            canMoveDown={index < questions.length - 1}
          />
        ))}
      </div>
      {canEdit && !questionsLocked && (
        <div className="ds-feedback-section-footer">
          <Button variant="secondary" size="small" onClick={onAddQuestion}>Add question</Button>
        </div>
      )}
    </Section>
  );
}
