import { createContext, useContext, type ReactNode } from "react";
import type { IssueCatalog } from "../domain/jira/issueCatalog";

const PerformanceIssueCatalogContext = createContext<IssueCatalog | undefined>(
  undefined,
);

export function PerformanceIssueCatalogProvider({
  catalog,
  children,
}: {
  catalog: IssueCatalog;
  children: ReactNode;
}) {
  return (
    <PerformanceIssueCatalogContext.Provider value={catalog}>
      {children}
    </PerformanceIssueCatalogContext.Provider>
  );
}

export function useOptionalPerformanceIssueCatalog(): IssueCatalog | undefined {
  const catalog = useContext(PerformanceIssueCatalogContext);
  if (!catalog || catalog.size === 0) return undefined;
  return catalog;
}
