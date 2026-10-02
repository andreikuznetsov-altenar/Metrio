import { onboardingLinksForDepartment } from "../../config/onboardingLinks";
import {
  formatHireDateLabel,
  formatNewStarterHeadline,
  isNewStarter,
} from "../../domain/onboarding/newStarter";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import { openExternalUrl } from "../../platform/openExternal";

export interface GettingStartedSectionProps {
  bamboo: ResolvedEmployee;
}

export function GettingStartedSection({ bamboo }: GettingStartedSectionProps) {
  const hireDate = bamboo.hireDate;
  if (!hireDate || !isNewStarter(hireDate)) {
    return null;
  }

  const links = onboardingLinksForDepartment(bamboo.department);
  if (!links.length) {
    return null;
  }

  return (
    <section className="performance-getting-started" aria-label="Getting started">
      <h3 className="performance-section__title">{formatNewStarterHeadline(hireDate)}</h3>
      <p className="performance-employee-context">
        {bamboo.jobTitle || bamboo.department || "Team member"}
        <br />
        {formatHireDateLabel(hireDate)}
      </p>
      <ul className="performance-getting-started__links">
        {links.map((link) => (
          <li key={link.id}>
            <button
              type="button"
              className="performance-link-button"
              onClick={() => void openExternalUrl(link.url)}
            >
              {link.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
