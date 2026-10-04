import type { HomeOrganizationWorkspace } from "../../../domain/home/homeTypes";
import { Button } from "../../../components/Button/Button";
import {
  ManagerExecutiveDashboard,
  type ManagerExecutiveDashboardProps,
} from "./ManagerExecutiveDashboard";

export function DirectorExecutiveDashboard(
  props: ManagerExecutiveDashboardProps & {
    organization: HomeOrganizationWorkspace;
    onOpenDirectorView: () => void;
  },
) {
  const { organization, onOpenDirectorView, ...managerProps } = props;
  return (
    <>
      <ManagerExecutiveDashboard {...managerProps} />
      <section
        className="executive-panel executive-dashboard__span-12"
        aria-label="Organization signals"
        data-testid="dashboard-director-org"
      >
        <h2 className="executive-panel__title">Organization</h2>
        <p className="home-card__meta">
          {organization.signalCount} signals · {organization.teamsNeedingAttention} teams need
          attention
        </p>
        <Button type="button" variant="secondary" onClick={onOpenDirectorView}>
          Open director view
        </Button>
      </section>
    </>
  );
}
