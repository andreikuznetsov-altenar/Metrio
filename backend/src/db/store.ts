import fs from "node:fs";
import path from "node:path";
import type { GoalRecord } from "../routes/goalsTypes.ts";

export interface AccessUser {
  bambooEmployeeId: string;
  email: string;
  role: "employee" | "lead" | "director";
  directReportIds: string[];
  isCompanyAdmin: boolean;
  hasOrganizationScope: boolean;
}

export interface ConfigVersionRow {
  id: string;
  schemaVersion: number;
  version: string;
  status: "draft" | "published";
  payload: unknown;
  createdAt: string;
  publishedAt: string | null;
  createdBy: string;
}

export interface OnboardingInstanceRow {
  employeeId: string;
  configVersion: string;
  startedAt: string;
  endsAt: string;
  manualCompletions: Record<string, { completedAt: string; undoneAt?: string }>;
  revision: number;
  updatedAt: string;
}

export interface AuditRow {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  at: string;
}

export interface MetrioDb {
  users: AccessUser[];
  goals: GoalRecord[];
  goalHistory: unknown[];
  configVersions: ConfigVersionRow[];
  onboarding: OnboardingInstanceRow[];
  audit: AuditRow[];
}

const EMPTY_DB: MetrioDb = {
  users: [],
  goals: [],
  goalHistory: [],
  configVersions: [],
  onboarding: [],
  audit: [],
};

export class MetrioStore {
  private data: MetrioDb;
  private readonly filePath: string | null;

  constructor(filePath: string | null) {
    this.filePath = filePath;
    this.data = filePath && fs.existsSync(filePath)
      ? (JSON.parse(fs.readFileSync(filePath, "utf8")) as MetrioDb)
      : { ...EMPTY_DB };
  }

  snapshot(): MetrioDb {
    return this.data;
  }

  replace(next: MetrioDb): void {
    this.data = next;
    this.persist();
  }

  update(mutator: (db: MetrioDb) => void): void {
    mutator(this.data);
    this.persist();
  }

  private persist(): void {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}

export function seedDevUsers(): AccessUser[] {
  return [
    {
      bambooEmployeeId: "person-alex",
      email: "person-alex@visual.metrio",
      role: "employee",
      directReportIds: [],
      isCompanyAdmin: false,
      hasOrganizationScope: false,
    },
    {
      bambooEmployeeId: "person-sam",
      email: "person-sam@visual.metrio",
      role: "lead",
      directReportIds: ["person-alex", "person-01"],
      isCompanyAdmin: true,
      hasOrganizationScope: false,
    },
    {
      bambooEmployeeId: "person-jordan",
      email: "person-jordan@visual.metrio",
      role: "director",
      directReportIds: ["person-06", "person-07"],
      isCompanyAdmin: false,
      hasOrganizationScope: true,
    },
    {
      bambooEmployeeId: "person-01",
      email: "person-01@visual.metrio",
      role: "employee",
      directReportIds: [],
      isCompanyAdmin: false,
      hasOrganizationScope: false,
    },
  ];
}
