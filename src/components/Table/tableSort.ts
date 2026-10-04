import {
  compareSemanticStatus,
  type StatusSortKind,
} from "./tableSemanticRank";

export type ColumnSortType =
  | "text"
  | "number"
  | "date"
  | "duration"
  | "status"
  | "person"
  | "issueKey"
  | "boolean";

export interface TableSortColumnMeta {
  id: string;
  type: ColumnSortType;
  statusKind?: StatusSortKind;
}

export type SortDirection = "asc" | "desc";

export type TableSortState = {
  columnId: string;
  direction: SortDirection;
} | null;

export function parseDurationDays(value: string): number {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "—") return -1;
  if (normalized.startsWith("<")) return 0.5;
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

export function parseIssueKeySort(value: string): number {
  const match = value.trim().match(/-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function compareScalar(a: unknown, b: unknown, type: ColumnSortType): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (type === "number") {
    const na = typeof a === "number" ? a : Number(a);
    const nb = typeof b === "number" ? b : Number(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  }

  if (type === "duration") {
    const da =
      typeof a === "number" ? a : parseDurationDays(String(a));
    const db =
      typeof b === "number" ? b : parseDurationDays(String(b));
    return da - db;
  }

  if (type === "issueKey") {
    const ka = typeof a === "number" ? a : parseIssueKeySort(String(a));
    const kb = typeof b === "number" ? b : parseIssueKeySort(String(b));
    return ka - kb;
  }

  if (type === "date") {
    const ta = new Date(String(a)).getTime();
    const tb = new Date(String(b)).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  }

  if (type === "boolean") {
    const ba = Boolean(a);
    const bb = Boolean(b);
    return Number(ba) - Number(bb);
  }

  const sa = String(a).toLocaleLowerCase();
  const sb = String(b).toLocaleLowerCase();
  return sa.localeCompare(sb, undefined, { sensitivity: "base" });
}

export function sortRows<T>(
  rows: T[],
  sort: TableSortState,
  getValue: (row: T, columnId: string) => unknown,
  getType: (columnId: string) => ColumnSortType,
  getStatusKind?: (columnId: string) => StatusSortKind | undefined,
): T[] {
  if (!sort) return rows;
  const { columnId, direction } = sort;
  const type = getType(columnId);
  const statusKind = getStatusKind?.(columnId);
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((left, right) => {
    const cmp =
      type === "status" && statusKind
        ? compareSemanticStatus(
            getValue(left.row, columnId),
            getValue(right.row, columnId),
            statusKind,
          )
        : compareScalar(
            getValue(left.row, columnId),
            getValue(right.row, columnId),
            type,
          );
    if (cmp !== 0) {
      return direction === "asc" ? cmp : -cmp;
    }
    return left.index - right.index;
  });
  return indexed.map((entry) => entry.row);
}

export function nextSortState(
  current: TableSortState,
  columnId: string,
): TableSortState {
  if (!current || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }
  return null;
}
