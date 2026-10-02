/**
 * Explicit organization scope — never inferred from job title.
 * Security provides person ids; empty list means directors stay on direct-report scope only.
 */
export function readExplicitOrganizationPersonIds(): string[] {
  const raw = import.meta.env.VITE_ORGANIZATION_SCOPE_PERSON_IDS;
  if (!raw || typeof raw !== "string") {
    return [];
  }
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
