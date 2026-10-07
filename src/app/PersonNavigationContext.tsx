import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { canOpenPersonDetail } from "../domain/personAccess";
import { PersonDetailDrawer } from "../pages/performance/PersonDetailDrawer";
import type { PersonDrawerTab } from "./performanceAnalyticsContext";
import { useCurrentUser } from "./CurrentUserContext";
import { usePerformanceData } from "./PerformanceDataContext";

export type OpenPerson = (
  personId: string,
  tab?: PersonDrawerTab,
) => void;

interface PersonNavigationValue {
  openPerson: OpenPerson;
  registerPersonDrawerHandler: (handler: OpenPerson) => () => void;
}

const PersonNavigationContext = createContext<PersonNavigationValue | null>(
  null,
);

export function PersonNavigationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useCurrentUser();
  const { performanceControlsDisabled } = usePerformanceData();
  const routeHandlerRef = useRef<OpenPerson | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [tab, setTab] = useState<PersonDrawerTab>("overview");
  const [open, setOpen] = useState(false);

  const openPerson = useCallback<OpenPerson>(
    (nextPersonId, nextTab = "overview") => {
      if (
        performanceControlsDisabled ||
        !canOpenPersonDetail(currentUser, nextPersonId)
      ) {
        return;
      }
      if (routeHandlerRef.current) {
        routeHandlerRef.current(nextPersonId, nextTab);
        return;
      }
      setPersonId(nextPersonId);
      setTab(nextTab);
      setOpen(true);
    },
    [currentUser, performanceControlsDisabled],
  );

  const registerPersonDrawerHandler = useCallback(
    (handler: OpenPerson) => {
      routeHandlerRef.current = handler;
      return () => {
        if (routeHandlerRef.current === handler) {
          routeHandlerRef.current = null;
        }
      };
    },
    [],
  );

  useEffect(() => {
    const handler = (event: Event) => {
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
      if (nextId) openPerson(nextId, nextTab);
    };
    window.addEventListener("metrio-open-person", handler);
    return () => window.removeEventListener("metrio-open-person", handler);
  }, [openPerson]);

  const value = useMemo(
    () => ({ openPerson, registerPersonDrawerHandler }),
    [openPerson, registerPersonDrawerHandler],
  );

  return (
    <PersonNavigationContext.Provider value={value}>
      {children}
      {personId ? (
        <PersonDetailDrawer
          personId={personId}
          open={open}
          activeTab={tab}
          onTabChange={setTab}
          onClose={() => setOpen(false)}
          onClosed={() => {
            setPersonId(null);
            setTab("overview");
          }}
        />
      ) : null}
    </PersonNavigationContext.Provider>
  );
}

export function usePersonNavigation(): PersonNavigationValue {
  const value = useContext(PersonNavigationContext);
  if (!value) {
    throw new Error("usePersonNavigation requires PersonNavigationProvider");
  }
  return value;
}
