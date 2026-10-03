import {
  formatHireDateLabel,
  formatNewStarterHeadline,
  isNewStarter,
} from "../../domain/onboarding/newStarter";
import type { MatchedOnboardingResources } from "../../domain/onboarding/resourceTypes";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import { openOnboardingResourceTarget } from "../../platform/openOnboardingResource";
import { Button } from "../../components/Button/Button";
import { ResourceRow } from "../../components/ResourceRow/ResourceRow";

export interface GettingStartedResourcesProps {
  bamboo: ResolvedEmployee;
  matched: MatchedOnboardingResources;
  onViewAll: () => void;
  compact?: boolean;
}

export function GettingStartedResources({
  bamboo,
  matched,
  onViewAll,
  compact = false,
}: GettingStartedResourcesProps) {
  const hireDate = bamboo.hireDate;
  if (!hireDate || !isNewStarter(hireDate)) {
    return null;
  }

  const items = matched.preview.slice(0, compact ? 3 : 6);
  if (!items.length) {
    return null;
  }

  return (
    <section
      className={compact ? "home-card" : "performance-getting-started"}
      aria-label="Getting started"
      data-testid="getting-started-resources"
    >
      <h2 className={compact ? "home-card__title" : "performance-section__title"}>
        {formatNewStarterHeadline(hireDate)}
      </h2>
      {!compact ? (
        <p className="performance-employee-context">
          {bamboo.jobTitle || bamboo.department || "Team member"}
          {bamboo.department && bamboo.jobTitle ? ` · ${bamboo.department}` : ""}
          <br />
          {formatHireDateLabel(hireDate)}
        </p>
      ) : null}
      <div className="getting-started__resource-list">
        {items.map((item) => (
          <ResourceRow
            key={item.id}
            title={item.title}
            subtitle={item.description}
            source={item.source}
            onOpen={() => void openOnboardingResourceTarget(item.target)}
          />
        ))}
      </div>
      {matched.all.length > items.length ? (
        <Button variant="ghost" onClick={onViewAll}>
          View all resources
        </Button>
      ) : null}
    </section>
  );
}
