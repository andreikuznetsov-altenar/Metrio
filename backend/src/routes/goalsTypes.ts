export interface GoalRecord {
  id: string;
  title: string;
  description?: string;
  ownerPersonId: string;
  createdByPersonId?: string;
  scope: "person" | "team";
  status: string;
  startDate?: string;
  targetDate?: string;
  reviewDate?: string;
  progressMode: string;
  manualProgress?: unknown;
  linkedJiraIssueKeys: string[];
  linkedJiraProjectKeys: string[];
  linkedConfluencePageIds: string[];
  employeeMayEditManualProgress: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
}
