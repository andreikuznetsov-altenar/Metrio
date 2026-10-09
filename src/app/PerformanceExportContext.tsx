import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import type {
  EmployeePerformanceView,
  TeamPerformanceView,
} from "../domain/performance";
import { usePerformanceData } from "./PerformanceDataContext";
import { useToast } from "../components/Toast/ToastContext";
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
import { isPdfExportInProgress } from "../services/export/pdfExportMutex";

export interface PerformanceExportContextValue {
  registerTeamView: (view: TeamPerformanceView) => void;
  registerEmployeeView: (view: EmployeePerformanceView) => void;
  registerWorkHistoryPeriod: (period: "week" | "month" | "quarter") => void;
  exportCurrentView: () => Promise<PdfExportResult | null>;
  canExport: boolean;
  exporting: boolean;
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
  const { data, status, refreshing, viewModels } = usePerformanceData();
  const toast = useToast();
  const [teamView, setTeamView] = useState<TeamPerformanceView>("overview");
  const [employeeView, setEmployeeView] =
    useState<EmployeePerformanceView>("overview");
  const [workHistoryPeriod, setWorkHistoryPeriod] = useState<
    "week" | "month" | "quarter"
  >("month");
  const [exporting, setExporting] = useState(false);

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
    if (!data || !exportView || exporting || isPdfExportInProgress()) {
      return null;
    }
    flushSync(() => {
      setExporting(true);
    });
    try {
      const payload = await buildPerformanceExportPayloadFromFetch({
        data,
        view: exportView,
        audience,
        selfPersonId,
        workHistoryPeriod:
          exportView === "personal-work-history" ? workHistoryPeriod : undefined,
        teamOverview:
          audience === "team" && exportView === "team-overview"
            ? viewModels?.teamOverview ?? null
            : null,
      });
      const result = await exportPerformancePdf(payload);
      if (result.status === "busy") {
        return null;
      }
      if (result.status === "saved") {
        const openResult = await openExportedPdf(result.path);
        if (openResult.status === "error") {
          toast.info(openResult.userMessage);
        } else {
          toast.success("PDF exported");
        }
      } else if (result.status === "cancelled") {
        toast.info(PDF_EXPORT_CANCELLED_MESSAGE.replace(/\.$/, ""));
      } else {
        toast.error(result.userMessage);
      }
      return result;
    } catch {
      toast.error("Couldn't export PDF");
      return null;
    } finally {
      setExporting(false);
    }
  }, [audience, data, exportView, exporting, selfPersonId, toast, viewModels, workHistoryPeriod]);

  const value = useMemo(
    (): PerformanceExportContextValue => ({
      registerTeamView: setTeamView,
      registerEmployeeView: setEmployeeView,
      registerWorkHistoryPeriod: setWorkHistoryPeriod,
      exportCurrentView,
      canExport,
      exporting,
    }),
    [canExport, exportCurrentView, exporting],
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
