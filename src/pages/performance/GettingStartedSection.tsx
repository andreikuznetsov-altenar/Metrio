import type { MatchedOnboardingResources } from "../../domain/onboarding/resourceTypes";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import { GettingStartedResources } from "../onboarding/GettingStartedResources";

export interface GettingStartedSectionProps {
  bamboo: ResolvedEmployee;
  matched: MatchedOnboardingResources;
  onViewAllResources: () => void;
}

export function GettingStartedSection({
  bamboo,
  matched,
  onViewAllResources,
}: GettingStartedSectionProps) {
  return (
    <GettingStartedResources
      bamboo={bamboo}
      matched={matched}
      onViewAll={onViewAllResources}
    />
  );
}
