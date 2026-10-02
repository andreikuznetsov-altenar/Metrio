import type { OnboardingChecklistModel } from "../../domain/onboardingChecklist/onboardingChecklistTypes";
import { formatNewStarterHeadline } from "../../domain/onboarding/newStarter";
import { daysUntilFeedbackDue } from "../../domain/onboardingChecklist/onboardingReminders";
import { Button } from "../../components/Button/Button";
import "./onboarding-checklist.css";

export interface OnboardingChecklistCardProps {
  model: OnboardingChecklistModel;
  onOpenDetail: () => void;
  compact?: boolean;
}

export function OnboardingChecklistCard({
  model,
  onOpenDetail,
  compact = false,
}: OnboardingChecklistCardProps) {
  const feedbackDays = daysUntilFeedbackDue(model);
  const headline = formatNewStarterHeadline(model.hireDate);

  return (
    <section
      className={compact ? "home-card" : "performance-getting-started"}
      aria-label="Onboarding checklist"
      data-testid="onboarding-checklist-card"
    >
      <h2 className={compact ? "home-card__title" : "performance-section__title"}>
        {headline}
      </h2>
      <p className="onboarding-checklist__progress">{model.progress.headline}</p>
      {model.progress.nextItems.length > 0 ? (
        <>
          <p className="home-card__meta">Next</p>
          <ul className="onboarding-checklist__next">
            {model.progress.nextItems.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </>
      ) : null}
      {feedbackDays != null && feedbackDays > 0 ? (
        <p className="home-card__meta">30-day feedback in {feedbackDays} days</p>
      ) : null}
      <Button variant="secondary" onClick={onOpenDetail}>
        View checklist
      </Button>
    </section>
  );
}
