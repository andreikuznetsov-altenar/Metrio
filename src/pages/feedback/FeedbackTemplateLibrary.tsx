import type { FeedbackSurveyTemplate } from '../../domain/feedbackCycles/feedbackCycleTypes';

export function FeedbackTemplateLibrary({
  templates,
}: {
  templates: FeedbackSurveyTemplate[];
}) {
  const byCategory = {
    team: templates.filter((t) => t.category === 'team'),
    onboarding: templates.filter((t) => t.category === 'onboarding'),
    project: templates.filter((t) => t.category === 'project'),
    custom: templates.filter((t) => t.category === 'custom'),
  };

  return (
    <section className="feedback-template-library" data-testid="feedback-template-library">
      <h3>Template library</h3>
      {(['team', 'onboarding', 'project', 'custom'] as const).map((cat) =>
        byCategory[cat].length ? (
          <div key={cat}>
            <h4>{cat}</h4>
            <ul>
              {byCategory[cat].map((t) => (
                <li key={t.id}>
                  {t.name} <span className="feedback-template-library__ver">v{t.version}</span>
                  <span className="feedback-template-library__meta">
                    {t.questions.length} questions
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </section>
  );
}
