export type UserRole = "employee" | "lead" | "director";

export interface Person {
  id: string;
  name: string;
  role: UserRole;
}

export interface Team {
  /** Manager this team belongs to. */
  leadId: string;
  /** Direct reports only — never nested or recursively expanded. */
  directReportIds: string[];
}

export interface CurrentUser {
  person: Person;
  /** Bamboo job title when available in production. */
  jobTitle?: string;
  /** Present when the user manages direct reports (lead or director). */
  team?: Team;
}

export type DevFixtureId = "employee" | "lead" | "director";

export type AppRoute = "performance" | "feedback";

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "employee":
      return "Employee";
    case "lead":
      return "Lead";
    case "director":
      return "Director";
  }
}

export function personInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
