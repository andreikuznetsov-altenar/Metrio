import { addDays, addMonths, format } from "date-fns";
import type { TimeOffEntry } from "./availability";
import { parseIsoDateOnly } from "../../components/DatePicker/datePickerValue";

export interface PlannedTimeOffRow {
  employeeId: string;
  personName?: string;
  start: string;
  end: string;
  rangeLabel: string;
  typeLabel: string;
}

function entryBounds(entry: TimeOffEntry): { start: string; end: string } | null {
  const start = entry.start || entry.startDate;
  const end = entry.end || entry.endDate;
  if (!start || !end) return null;
  return { start: start.slice(0, 10), end: end.slice(0, 10) };
}

function dedupeKey(employeeId: string, start: string, end: string): string {
  return `${employeeId}:${start}:${end}`;
}

export function getWhosOutHorizonRange(
  today: Date = new Date(),
): { start: string; end: string } {
  const start = format(today, "yyyy-MM-dd");
  const end = format(addMonths(today, 12), "yyyy-MM-dd");
  return { start, end };
}

export function splitWhosOutRange(
  start: string,
  end: string,
  chunkMonths = 3,
): { start: string; end: string }[] {
  const chunks: { start: string; end: string }[] = [];
  let cursor = parseIsoDateOnly(start);
  const horizonEnd = parseIsoDateOnly(end);
  if (!cursor || !horizonEnd) return [{ start, end }];

  while (cursor <= horizonEnd) {
    let chunkEnd: Date = addMonths(cursor, chunkMonths);
    if (chunkEnd > horizonEnd) {
      chunkEnd = horizonEnd;
    }
    chunks.push({
      start: format(cursor, "yyyy-MM-dd"),
      end: format(chunkEnd, "yyyy-MM-dd"),
    });
    cursor = addDays(chunkEnd, 1);
  }

  return chunks.length ? chunks : [{ start, end }];
}

export function buildPlannedTimeOffRows(
  entries: TimeOffEntry[],
  teamEmployeeIds: Set<string>,
  today: Date = new Date(),
): PlannedTimeOffRow[] {
  const todayIso = format(today, "yyyy-MM-dd");
  const seen = new Set<string>();
  const rows: PlannedTimeOffRow[] = [];

  for (const entry of entries) {
    const employeeId = String(entry.employeeId || "");
    if (!employeeId || !teamEmployeeIds.has(employeeId)) continue;
    const bounds = entryBounds(entry);
    if (!bounds || bounds.end < todayIso) continue;

    const key = dedupeKey(employeeId, bounds.start, bounds.end);
    if (seen.has(key)) continue;
    seen.add(key);

    const startDate = parseIsoDateOnly(bounds.start);
    const endDate = parseIsoDateOnly(bounds.end);
    if (!startDate || !endDate) continue;

    const sameMonth =
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear();
    const rangeLabel = sameMonth
      ? `${format(startDate, "d")}–${format(endDate, "d MMM yyyy")}`
      : `${format(startDate, "d MMM yyyy")} – ${format(endDate, "d MMM yyyy")}`;

    const typeRaw = String(entry.type || "Time off");
    const typeLabel =
      typeRaw.toLowerCase().includes("holiday") ? "Holiday" : "Vacation";

    rows.push({
      employeeId,
      personName: entry.name,
      start: bounds.start,
      end: bounds.end,
      rangeLabel,
      typeLabel,
    });
  }

  rows.sort((a, b) => a.start.localeCompare(b.start));
  return rows;
}
