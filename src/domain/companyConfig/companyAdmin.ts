import type { CurrentUser } from "../types";
import type { AccessPolicy, CompanyConfig } from "./companyConfigTypes";

export interface AdminIdentity {
  employeeId?: string;
  email?: string;
}

export function resolveAdminIdentity(
  currentUser: CurrentUser,
  workEmail?: string,
): AdminIdentity {
  return {
    employeeId: currentUser.person.id,
    email: (workEmail || "").trim().toLowerCase(),
  };
}

/** Admin from explicit allowlist only — never jobTitle. */
export function isCompanyAdmin(
  identity: AdminIdentity,
  policy: AccessPolicy | undefined,
): boolean {
  const admins = policy?.companyAdmins;
  if (!admins) return false;
  const email = identity.email?.toLowerCase();
  if (email && admins.emails?.some((e) => e.toLowerCase() === email)) {
    return true;
  }
  if (
    identity.employeeId &&
    admins.employeeIds?.includes(identity.employeeId)
  ) {
    return true;
  }
  return false;
}

export function applyCompanyConfigForDevAdmin(
  config: CompanyConfig,
  adminEmails: string[],
): CompanyConfig {
  return {
    ...config,
    accessPolicy: {
      ...config.accessPolicy,
      companyAdmins: { emails: adminEmails },
    },
  };
}
