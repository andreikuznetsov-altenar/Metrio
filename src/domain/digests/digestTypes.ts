export type DigestRoleVariant = "employee" | "manager" | "director";

export type DigestKind = "daily" | "weekly";

export interface DigestSection {
  id: string;
  title: string;
  lines: string[];
}

export interface OperationalDigest {
  kind: DigestKind;
  role: DigestRoleVariant;
  id: string;
  periodLabel: string;
  generatedAt: string;
  sinceLabel: string;
  sections: DigestSection[];
  summaryLine: string;
  plainText: string;
}

/** @deprecated Use OperationalDigest */
export type DailyBrief = OperationalDigest & { kind: "daily" };
export type WeeklyDigest = OperationalDigest & { kind: "weekly" };
