const ENUM_LABELS: Record<string, string> = {
  not_configured: "Not configured",
  connected: "Connected",
  unavailable: "Unavailable",
  permission_limited: "Limited permissions",
  authentication_required: "Authentication required",
  in_progress: "In progress",
  not_started: "Not started",
  first_pass: "First pass",
  rework: "Rework",
  backflow: "Backflow",
  pulse: "Pulse",
  monthly: "Monthly",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
  weekly: "Weekly",
  quarterly: "Quarterly",
};

export function humanizeMachineEnum(value: string | null | undefined): string {
  if (!value) return "—";
  const key = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (ENUM_LABELS[key]) return ENUM_LABELS[key];
  if (/^[a-z]+_[a-z_]+$/.test(key)) {
    return key
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return value;
}
