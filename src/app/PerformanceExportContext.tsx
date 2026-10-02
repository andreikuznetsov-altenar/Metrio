import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  EmployeePerformanceView,
  TeamPerformanceView,
} from "../domain/performance";
import { usePerformanceData } from "./PerformanceDataContext";
import { buildPerformanceExportPayloadFromFetch } from "../services/export/performanceExportBridge";
import {
  exportPerformancePdf,
  openExportedPdf,
  type PdfExportResult,
} from "../services/export/pdfExport";
import {
  canExportPerformanceReport,
  resolveExportView,
} from "../services/export/pdfFilename";
import type { PerformanceExportView } from "../services/export/types";
import { PDF_EXPORT_CANCELLED_MESSAGE } from "../services/export/pdfExportMessages";

export interface PerformanceExportContextValue {
  registerTeamView: (view: TeamPerformanceView) => void;
  registerEmployeeView: (view: EmployeePerformanceView) => void;
  registerWorkHistoryPeriod: (period: "week" | "month" | "quarter") => void;
  exportCurrentView: () => Promise<PdfExportResult | null>;
  canExport: boolean;
  exporting: boolean;
  exportMessage: string | null;
  clearExportMessage: () => void;
}

const PerformanceExportContext =
  createContext<PerformanceExportContextValue | null>(null);

export function PerformanceExportProvider({
  audience,
  children,
  selfPersonId,
}: {
  audience: "team" | "employee";
  selfPersonId: string;
  children: ReactNode;
}) {
  const { data, status, refreshing } = usePerformanceData();
  const [teamView, setTeamView] = useState<TeamPerformanceView>("overview");
  const [employeeView, setEmployeeView] =
    useState<EmployeePerformanceView>("overview");
  const [workHistoryPeriod, setWorkHistoryPeriod] = useState<
    "week" | "month" | "quarter"
  >("month");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!exportMessage) return;
    const transient =
      exportMessage === "PDF exported." ||
      exportMessage === PDF_EXPORT_CANCELLED_MESSAGE;
    if (!transient) return;
    const timer = window.setTimeout(() => setExportMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [exportMessage]);

  const activeTab = audience === "team" ? teamView : employeeView;
  const exportView = resolveExportView(activeTab, audience === "team");

  const canExport = canExportPerformanceReport({
    reportData: data,
    reportLoading: status === "loading" || status === "refreshing" || refreshing,
    exporting,
    needsSetup: false,
    view: exportView,
  });

  const exportCurrentView = useCallback(async () => {
    if (!data || !exportView) {
      return null;
    }
    setExporting(true);
    setExportMessage(null);
    try {
      const payload = await buildPerformanceExportPayloadFromFetch({
        data,
        view: exportView,
        audience,
        selfPersonId,
        workHistoryPeriod:
          exportView === "personal-work-history" ? workHistoryPeriod : undefined,
      });
      const result = await exportPerformancePdf(payload);
      if (result.status === "saved") {
        setExportMessage("PDF exported.");
        const openResult = await openExportedPdf(result.path);
        if (openResult.status === "error") {
          setExportMessage(openResult.userMessage);
        }
      } else if (result.status === "cancelled") {
        setExportMessage(PDF_EXPORT_CANCELLED_MESSAGE);
      } else {
        setExportMessage(result.userMessage);
      }
      return result;
    } catch {
      setExportMessage("Couldn't export the PDF. Try again.");
      return null;
    } finally {
      setExporting(false);
    }
  }, [audience, data, exportView, selfPersonId, workHistoryPeriod]);

  const value = useMemo(
    (): PerformanceExportContextValue => ({
      registerTeamView: setTeamView,
      registerEmployeeView: setEmployeeView,
      registerWorkHistoryPeriod: setWorkHistoryPeriod,
      exportCurrentView,
      canExport,
      exporting,
      exportMessage,
      clearExportMessage: () => setExportMessage(null),
    }),
    [
      canExport,
      exportCurrentView,
      exporting,
      exportMessage,
    ],
  );

  return (
    <PerformanceExportContext.Provider value={value}>
      {children}
    </PerformanceExportContext.Provider>
  );
}

export function usePerformanceExport(): PerformanceExportContextValue {
  const ctx = useContext(PerformanceExportContext);
  if (!ctx) {
    throw new Error(
      "usePerformanceExport must be used within PerformanceExportProvider",
    );
  }
  return ctx;
}

export function useOptionalPerformanceExport(): PerformanceExportContextValue | null {
  return useContext(PerformanceExportContext);
}

export type { PerformanceExportView };
