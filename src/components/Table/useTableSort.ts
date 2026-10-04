import { useCallback, useMemo, useState } from "react";
import {
  nextSortState,
  sortRows,
  type ColumnSortType,
  type TableSortState,
} from "./tableSort";

export interface TableSortColumn {
  id: string;
  type: ColumnSortType;
}

export function useTableSort<T>(
  rows: T[],
  columns: TableSortColumn[],
  getValue: (row: T, columnId: string) => unknown,
) {
  const [sort, setSort] = useState<TableSortState>(null);

  const typeById = useMemo(() => {
    const map = new Map<string, ColumnSortType>();
    for (const column of columns) {
      map.set(column.id, column.type);
    }
    return map;
  }, [columns]);

  const sortedRows = useMemo(
    () =>
      sortRows(rows, sort, getValue, (columnId) => typeById.get(columnId) ?? "text"),
    [rows, sort, getValue, typeById],
  );

  const toggleSort = useCallback((columnId: string) => {
    setSort((current) => nextSortState(current, columnId));
  }, []);

  const getAriaSort = useCallback(
    (columnId: string): "ascending" | "descending" | "none" => {
      if (!sort || sort.columnId !== columnId) return "none";
      return sort.direction === "asc" ? "ascending" : "descending";
    },
    [sort],
  );

  return { sortedRows, sort, toggleSort, getAriaSort };
}
