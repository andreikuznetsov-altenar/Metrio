import type { OrgRole } from "../../domain/organization/orgRole";
import type {
  OrgResolutionResult,
  ResolvedEmployee,
} from "../../services/bamboo/orgResolver";

export function splitDepartmentLabel(department?: string): {
  department?: string;
  team?: string;
} {
  const raw = department?.trim();
  if (!raw) {
    return {};
  }
  const parts = raw
    .split(/\s*[/|›>]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { department: parts[0], team: parts.slice(1).join(" / ") };
  }
  return { department: raw };
}

export function metrioWorkspaceLabel(orgRole: OrgRole | "unresolved"): string {
  switch (orgRole) {
    case "manager_of_managers":
      return "Director workspace";
    case "leaf_manager":
      return "Team lead workspace";
    case "individual_contributor":
      return "Individual workspace";
    default:
      return "Workspace scope unresolved";
  }
}

function rosterEmployees(org: OrgResolutionResult): ResolvedEmployee[] {
  const byId = new Map<string, ResolvedEmployee>();
  const add = (employee: ResolvedEmployee) => {
    if (employee.id) {
      byId.set(employee.id, employee);
    }
  };
  if (org.employee) {
    add(org.employee);
  }
  if (org.manager) {
    add(org.manager);
  }
  for (const employee of org.directReports) {
    add(employee);
  }
  for (const employee of org.fullTeam) {
    add(employee);
  }
  return [...byId.values()];
}

/**
 * Person Profile MANAGER: Bamboo HR upstream manager.
 * Prefers `org.manager` from Bamboo resolution; falls back to supervisor id/email lookup.
 */
export function resolveManagerEmployee(
  org: OrgResolutionResult,
): ResolvedEmployee | null {
  if (org.manager?.id) {
    return org.manager;
  }

  const self = org.employee;
  if (!self) {
    return null;
  }
  const roster = rosterEmployees(org);
  if (self.supervisorId) {
    const byId = roster.find((employee) => employee.id === self.supervisorId);
    if (byId) {
      return byId;
    }
  }
  const supervisorEmail = self.supervisorEmail?.trim().toLowerCase();
  if (supervisorEmail) {
    const byEmail = roster.find(
      (employee) => employee.workEmail?.trim().toLowerCase() === supervisorEmail,
    );
    if (byEmail) {
      return byEmail;
    }
  }
  return null;
}

export function hasSupervisorReference(org: OrgResolutionResult): boolean {
  if (org.manager?.id) {
    return true;
  }
  const self = org.employee;
  if (!self) {
    return false;
  }
  return Boolean(self.supervisorId?.trim() || self.supervisorEmail?.trim());
}

export const NO_BAMBOO_MANAGER_COPY = "No manager is listed in BambooHR";
