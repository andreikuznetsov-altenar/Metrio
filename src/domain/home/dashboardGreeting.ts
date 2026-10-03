/** Local-time greeting for Dashboard (user device clock). */
export function greetingForHour(now: Date): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatDashboardGreeting(displayName: string, now: Date): string {
  const first = displayName.trim().split(/\s+/)[0] || displayName.trim();
  return `${greetingForHour(now)}, ${first}`;
}
