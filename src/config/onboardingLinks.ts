export interface OnboardingLink {
  id: string;
  label: string;
  kind: "confluence" | "jira" | "bamboo" | "external";
  url: string;
  department?: string;
}

/** Curated company-wide links — maintain here, not per employee. */
export const COMPANY_ONBOARDING_LINKS: OnboardingLink[] = [
  {
    id: "company-handbook",
    label: "Company Handbook",
    kind: "external",
    url: "https://www.bamboohr.com/",
  },
  {
    id: "bamboo-home",
    label: "Time off & policies",
    kind: "bamboo",
    url: "https://www.bamboohr.com/",
  },
];

export function onboardingLinksForDepartment(
  department: string | undefined,
  max = 7,
): OnboardingLink[] {
  const dept = department?.trim().toLowerCase();
  const company = COMPANY_ONBOARDING_LINKS.slice(0, 3);
  if (!dept) return company.slice(0, max);
  const deptLinks = COMPANY_ONBOARDING_LINKS.filter(
    (link) => link.department?.toLowerCase() === dept,
  );
  return [...company, ...deptLinks].slice(0, max);
}
