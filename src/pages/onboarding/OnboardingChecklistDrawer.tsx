import type { OnboardingChecklistModel, OnboardingItem } from "../../domain/onboardingChecklist/onboardingChecklistTypes";
import { openOnboardingResourceTarget } from "../../platform/openOnboardingResource";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import "./onboarding-checklist.css";

const CATEGORY_LABELS: Record<string, string> = {
  company: "Company",
  team: "Team",
  tools: "Tools",
  knowledge: "Knowledge",
  bamboo: "Bamboo",
  jira: "Jira",
  feedback: "Feedback",
};

export interface OnboardingChecklistDrawerProps {
  open: boolean;
  model: OnboardingChecklistModel;
  onClose: () => void;
  onManualToggle: (itemId: string, complete: boolean) => void;
  managerView?: boolean;
}

function statusIcon(item: OnboardingItem): string {
  if (item.status === "complete") return "✓";
  return "○";
}

function ChecklistItemRow({
  item,
  onManualToggle,
}: {
  item: OnboardingItem;
  onManualToggle: (itemId: string, complete: boolean) => void;
}) {
  return (
    <li
      className={`onboarding-checklist-item${item.autoCompleted ? " onboarding-checklist-item--auto" : ""}`}
      data-testid={`onboarding-item-${item.id}`}
    >
      <span className="onboarding-checklist-item__status" aria-hidden="true">
        {statusIcon(item)}
      </span>
      <div className="onboarding-checklist-item__body">
        <strong>{item.title}</strong>
        {item.isMilestone ? (
          <p className="onboarding-checklist-item__meta">Milestone — not a required HR step</p>
        ) : null}
        {item.description ? (
          <p className="onboarding-checklist-item__meta">{item.description}</p>
        ) : null}
        {item.dueLabel ? (
          <p className="onboarding-checklist-item__meta">{item.dueLabel}</p>
        ) : null}
        {item.evidence ? (
          <p className="onboarding-checklist-item__meta">{item.evidence.summary}</p>
        ) : null}
        <div className="onboarding-checklist-item__actions">
          {item.target ? (
            <Button
              variant="ghost"
              onClick={() => void openOnboardingResourceTarget(item.target!)}
            >
              Open
            </Button>
          ) : null}
          {item.canManualComplete ? (
            <Button
              variant="secondary"
              onClick={() => onManualToggle(item.id, true)}
            >
              Mark complete
            </Button>
          ) : null}
          {item.canManualUndo ? (
            <Button variant="ghost" onClick={() => onManualToggle(item.id, false)}>
              Undo
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function OnboardingChecklistDrawer({
  open,
  model,
  onClose,
  onManualToggle,
}: OnboardingChecklistDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="Onboarding checklist"
      size="person"
      className="drawer--onboarding-checklist"
      testId="onboarding-checklist-drawer"
      header={
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Onboarding checklist</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>
            {model.progress.headline}
          </p>
        </div>
      }
    >
      {Object.entries(model.byCategory).map(([cat, items]) =>
        items?.length ? (
          <section key={cat} className="onboarding-checklist-drawer__group">
            <h3 className="onboarding-checklist-drawer__group-title">
              {CATEGORY_LABELS[cat] ?? cat}
            </h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map((item) => (
                <ChecklistItemRow
                  key={`${cat}-${item.id}`}
                  item={item}
                  onManualToggle={onManualToggle}
                />
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </Drawer>
  );
}
