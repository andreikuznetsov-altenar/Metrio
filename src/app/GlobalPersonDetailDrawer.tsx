import { useCallback, useEffect, useRef, useState } from "react";
import type { AppRoute } from "../domain/types";
import { canOpenPersonDetail } from "../domain/personAccess";
import { PersonDetailDrawer } from "../pages/performance/PersonDetailDrawer";
import { useCurrentUser } from "./CurrentUserContext";
import type { PersonDrawerTab } from "./performanceAnalyticsContext";

export interface GlobalPersonDetailDrawerProps {
  activeRoute: AppRoute;
}

/**
 * Hosts the person detail drawer for routes outside Performance (e.g. Home).
 * PerformancePage keeps its own drawer wired to analytics drilldown state.
 */
export function GlobalPersonDetailDrawer({ activeRoute }: GlobalPersonDetailDrawerProps) {
  const { currentUser } = useCurrentUser();
  const [personId, setPersonId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PersonDrawerTab>("overview");
  const activeRouteRef = useRef(activeRoute);
  activeRouteRef.current = activeRoute;

  useEffect(() => {
    if (activeRoute === "performance") {
      setOpen(false);
    }
  }, [activeRoute]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (activeRouteRef.current === "performance") return;
      const detail = (
        event as CustomEvent<string | { personId: string; tab?: PersonDrawerTab }>
      ).detail;
      let nextId: string | null = null;
      let nextTab: PersonDrawerTab = "overview";
      if (typeof detail === "string" && detail) {
        nextId = detail;
      } else if (detail && typeof detail === "object" && detail.personId) {
        nextId = detail.personId;
        nextTab = detail.tab ?? "overview";
      }
      if (!nextId || !canOpenPersonDetail(currentUser, nextId)) return;
      setPersonId(nextId);
      setTab(nextTab);
      setOpen(true);
    };
    window.addEventListener("metrio-open-person", handler);
    return () => window.removeEventListener("metrio-open-person", handler);
  }, [activeRoute, currentUser]);

  const onClose = useCallback(() => setOpen(false), []);
  const onClosed = useCallback(() => {
    setPersonId(null);
    setTab("overview");
  }, []);

  if (!personId) return null;

  return (
    <PersonDetailDrawer
      personId={personId}
      open={open}
      activeTab={tab}
      onTabChange={setTab}
      onClose={onClose}
      onClosed={onClosed}
    />
  );
}
