import { useCallback, useEffect, useState } from "react";
import type { ArchivedReportRecord } from "../domain/reports/reportHistoryTypes";
import { REPORT_HISTORY_CHANGED_EVENT } from "../services/reports/reportHistoryEvents";
import { loadArchivedReports } from "../services/reports/reportHistoryStore";

export function useArchivedReports() {
  const [reports, setReports] = useState<ArchivedReportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await loadArchivedReports();
    setReports(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => {
      void refresh();
    };
    window.addEventListener(REPORT_HISTORY_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(REPORT_HISTORY_CHANGED_EVENT, onChanged);
  }, [refresh]);

  return { reports, loading, refresh };
}
