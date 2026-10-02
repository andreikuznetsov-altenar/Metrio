import type { DeliveryRiskRow } from "../../../domain/performance";
import type { DeliveryRiskItem } from "../../../domain/radar/types";
import { TeamDeliveryRiskView } from "../TeamDeliveryRiskView";

export interface DirectorDeliveryViewProps {
  deliveryRisk: DeliveryRiskItem[];
  teamFilterLabel?: string;
  onOpenPerson: (personId: string) => void;
}

function toRows(items: DeliveryRiskItem[]): DeliveryRiskRow[] {
  return items.map((item) => ({
    issueKey: item.issueKey,
    issueTitle: item.summary,
    ownerId: item.personId,
    ownerName: item.personName,
    age: item.stageLabel,
    status: item.status,
    riskReason: item.reason,
  }));
}

export function DirectorDeliveryView({
  deliveryRisk,
  teamFilterLabel,
  onOpenPerson,
}: DirectorDeliveryViewProps) {
  return (
    <div data-testid="director-delivery">
      {teamFilterLabel ? (
        <p className="performance-employee-context">Filtered: {teamFilterLabel}</p>
      ) : null}
      <TeamDeliveryRiskView rows={toRows(deliveryRisk)} onOpenPerson={onOpenPerson} />
    </div>
  );
}
