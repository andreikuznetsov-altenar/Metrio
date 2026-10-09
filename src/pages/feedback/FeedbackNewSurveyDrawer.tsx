import { useMemo, useState } from 'react';
import type { Person } from '../../domain/people/types';
import type { SurveyQuestion } from '../../domain/survey/types';
import { createDefaultSurveyData } from '../../domain/survey/defaults';
import { assignQuestionIds } from '../../domain/feedbackV2/questionIdentity';
import { FeedbackQuestionEditor } from './FeedbackQuestionEditor';
import { Button, Drawer, Input } from './design-system';

export function FeedbackNewSurveyDrawer({
  open,
  mode,
  teamMembers,
  initialTitle,
  initialQuestions,
  initialRecipientIds,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: 'create' | 'repeat';
  teamMembers: Person[];
  initialTitle?: string;
  initialQuestions?: SurveyQuestion[];
  initialRecipientIds?: string[];
  busy?: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    introText: string;
    emailSubject: string;
    questions: SurveyQuestion[];
    recipientPersonIds: string[];
  }) => Promise<void>;
}) {
  const defaults = useMemo(() => createDefaultSurveyData(), []);
  const [title, setTitle] = useState(initialTitle ?? defaults.title);
  const [introText, setIntroText] = useState(defaults.introText);
  const [emailSubject, setEmailSubject] = useState(defaults.emailSubject);
  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    initialQuestions ?? assignQuestionIds(defaults.questions),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialRecipientIds ?? []),
  );

  const toggleRecipient = (personId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  };

  const updateQuestion = (index: number, patch: Partial<SurveyQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setQuestions(next);
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        googleQuestionId: null,
        active: true,
        type: 'scale',
        title: '',
        options: '1|5',
        helpText: '',
        required: false,
      },
    ]);
  };

  const handleSubmit = async () => {
    await onSubmit({
      title: title.trim(),
      introText,
      emailSubject,
      questions,
      recipientPersonIds: [...selectedIds],
    });
  };

  return (
    <Drawer
      open={open}
      size="person"
      title={mode === 'create' ? 'New survey' : 'Repeat survey'}
      onClose={onClose}
      footer={
        <div className="ds-feedback-drawer-footer">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={busy || !title.trim() || selectedIds.size === 0 || !questions.some((q) => q.active && q.title.trim())}
            onClick={() => void handleSubmit()}
          >
            {busy ? 'Creating…' : mode === 'create' ? 'Create survey' : 'Create new run'}
          </Button>
        </div>
      }
    >
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input label="Email subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
      <Input label="Intro" value={introText} onChange={(e) => setIntroText(e.target.value)} />

      <h3 className="feedback-drawer-section-title">Recipients</h3>
      <ul className="feedback-recipient-pick-list">
        {teamMembers.map((person) => (
          <li key={person.id}>
            <label>
              <input
                type="checkbox"
                checked={selectedIds.has(person.id)}
                onChange={() => toggleRecipient(person.id)}
              />
              <span>{person.bamboo.displayName}</span>
              <span className="feedback-recipient-pick-list__email">
                {person.bamboo.workEmail || 'No email'}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <h3 className="feedback-drawer-section-title">Questions</h3>
      {questions.map((question, index) => (
        <FeedbackQuestionEditor
          key={question.id}
          index={index}
          question={question}
          onChange={(patch) => updateQuestion(index, patch)}
          onDelete={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
          onMoveUp={() => moveQuestion(index, -1)}
          onMoveDown={() => moveQuestion(index, 1)}
          canMoveUp={index > 0}
          canMoveDown={index < questions.length - 1}
        />
      ))}
      <Button type="button" variant="secondary" size="small" onClick={addQuestion}>
        Add question
      </Button>
    </Drawer>
  );
}
