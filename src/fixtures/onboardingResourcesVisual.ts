import type { CuratedOnboardingResourceDef } from "../config/onboardingResources";
import { deptKey } from "../config/onboardingResources";

/**
 * Deterministic sample URLs for Playwright / VITE_VISUAL_FIXTURE only.
 * Never used in production builds.
 */
export const VISUAL_CURATED_ONBOARDING_RESOURCES: CuratedOnboardingResourceDef[] = [
  {
    id: "company-handbook-visual",
    title: "Company handbook",
    description: "Policies and how we work",
    group: "company",
    audience: "company",
    source: "curated",
    priority: 100,
    tags: ["policies", "onboarding"],
    target: {
      kind: "external",
      url: "https://example.test/wiki/handbook",
    },
  },
  {
    id: "design-handbook-visual",
    title: "Design handbook",
    group: "department",
    audience: "department",
    audienceKey: deptKey("Design"),
    source: "curated",
    priority: 80,
    jobTitleHints: ["design", "ux"],
    target: {
      kind: "external",
      url: "https://example.test/wiki/design",
    },
  },
];
