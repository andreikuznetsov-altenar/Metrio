import {
  formatHireDateLabel,
  formatNewStarterHeadline,
  isNewStarter,
} from "../../domain/onboarding/newStarter";
import type { MatchedOnboardingResources } from "../../domain/onboarding/resourceTypes";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import { openOnboardingResourceTarget } from "../../platform/openOnboardingResource";
import { Button } from "../../components/Button/Button";

export interface ManagerNewStarterContextProps {
  bamboo: ResolvedEmployee;
  matched: MatchedOnboardingResources;
  activeWorkCount?: number;
}

export function ManagerNewStarterContext({
  bamboo,
  matched,
  activeWorkCount,
}: ManagerNewStarterContextProps) {
  const hireDate = bamboo.hireDate;
  if (!hireDate || !isNewStarter(hireDate)) {
    return null;
  }

  const teamResources = matched.preview.slice(0, 4);

  return (
    <section className="person-detail-drawer__time-off" aria-label="New starter context">
      <h3 className="person-detail-drawer__section-title">New starter</h3>
      <p className="person-detail-drawer__context">
        {formatNewStarterHeadline(hireDate)} · {bamboo.displayName}
        <br />
        {formatHireDateLabel(hireDate)}
        {activeWorkCount != null ? ` · ${activeWorkCount} active tasks` : ""}
      </p>
      {teamResources.length > 0 ? (
        <>
          <p className="person-detail-drawer__time-off-note">Useful team resources</p>
          <ul className="performance-getting-started__links">
            {teamResources.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="performance-link-button"
                  onClick={() => void openOnboardingResourceTarget(item.target)}
                >
                  {item.title}
                </button>
                {urlFromTarget(item.target) ? (
                  <Button
                    variant="ghost"
                    onClick={() => void navigator.clipboard?.writeText(urlFromTarget(item.target)!)}
                  >
                    Copy link
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function urlFromTarget(target: import("../../domain/onboarding/resourceTypes").OnboardingResource["target"]) {
  if (target.kind === "bamboo_portal" || target.kind === "metrio_resources") return null;
  return target.url || null;
}
