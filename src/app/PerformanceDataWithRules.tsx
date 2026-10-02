import type { PerformanceDataProviderProps } from "./PerformanceDataContext";
import { PerformanceDataProvider } from "./PerformanceDataContext";
import { useOperationalRules } from "./OperationalRulesContext";

type Props = Omit<PerformanceDataProviderProps, "operationalRules">;

export function PerformanceDataWithRules(props: Props) {
  const { rules } = useOperationalRules();
  return <PerformanceDataProvider {...props} operationalRules={rules} />;
}
