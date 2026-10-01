import type {
  ActiveWorkItem,
  PersonalAttentionItem,
  PersonDetailSnapshot,
  WorkHistoryRow,
} from "../domain/performance";

function hash(value: string): number {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

const ACTIVE_WORK_TEMPLATES = [
  { key: "MET-142", title: "Improve onboarding checklist flow", status: "In progress" },
  { key: "MET-139", title: "Resolve flaky integration test", status: "In review" },
  { key: "MET-131", title: "Update API error messaging", status: "In progress" },
];

const HISTORY_TEMPLATES: WorkHistoryRow[] = [
  {
    key: "MET-120",
    title: "Add validation to settings form",
    project: "MET",
    completedOn: "Sep 24",
    cycle: "2.0d",
    outcome: "First pass",
  },
  {
    key: "MET-117",
    title: "Fix pagination on activity feed",
    project: "MET",
    completedOn: "Sep 18",
    cycle: "3.1d",
    outcome: "Reworked once",
  },
  {
    key: "MET-112",
    title: "Document release checklist",
    project: "MET",
    completedOn: "Sep 11",
    cycle: "1.6d",
    outcome: "First pass",
  },
];

export function getPersonDetailSnapshot(personId: string): PersonDetailSnapshot {
  const seed = hash(personId);
  const workload = (["Light", "Balanced", "Heavy"] as const)[seed % 3];
  const availability = seed % 5 === 0 ? "Limited this week" : "Available";

  const attention: PersonalAttentionItem[] =
    seed % 3 === 0
      ? [
          {
            label: "Watch",
            variant: "warning",
            reason: "Cycle time above personal target",
          },
        ]
      : seed % 4 === 0
        ? [
            {
              label: "At risk",
              variant: "danger",
              reason: "Open review blocking delivery",
            },
          ]
        : [];

  const activeWork: ActiveWorkItem[] = ACTIVE_WORK_TEMPLATES.slice(
    0,
    2 + (seed % 2),
  ).map((item, index) => ({
    ...item,
    key: `${item.key.slice(0, 4)}${100 + seed + index}`,
  }));

  return {
    personId,
    availability,
    workload,
    efficiency: `${78 + (seed % 15)}%`,
    firstPass: `${70 + (seed % 20)}%`,
    completed: `${12 + (seed % 8)}`,
    backflows: `${1 + (seed % 2)}`,
    attention,
    activeWork,
    problematicWork: [],
    history: HISTORY_TEMPLATES,
  };
}
