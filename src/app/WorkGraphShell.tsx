import type { ReactNode } from "react";
import { WorkGraphProvider } from "./WorkGraphContext";
import { usePerformanceData } from "./PerformanceDataContext";

export function WorkGraphShell({
  selfPersonId,
  children,
}: {
  selfPersonId: string;
  children: ReactNode;
}) {
  const { data } = usePerformanceData();
  const selfPerson =
    data?.teamSnapshot.persons.find((person) => person.id === selfPersonId) ??
    null;

  return (
    <WorkGraphProvider
      person={selfPerson}
      params={data?.reportParams}
      datasetKey={data?.lastUpdatedAt ?? "idle"}
      department={selfPerson?.bamboo.department}
    >
      {children}
    </WorkGraphProvider>
  );
}
