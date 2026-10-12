import { Button } from "../../../components/Button/Button";
import { PersonIdentity } from "../../../components/PersonIdentity/PersonIdentity";
import { openExternalUrl } from "../../../platform/openExternal";
import type { ResolvedEmployee } from "../../../services/bamboo/orgResolver";
import "./dashboard-your-manager.css";

export interface DashboardYourManagerCardProps {
  manager?: ResolvedEmployee | null;
  selfDepartment?: string;
}

export function DashboardYourManagerCard({
  manager,
  selfDepartment,
}: DashboardYourManagerCardProps) {
  if (!manager) {
    return (
      <section
        className="dashboard-your-manager executive-panel"
        aria-labelledby="dashboard-your-manager-title"
        data-testid="dashboard-your-manager-unavailable"
      >
        <h3 id="dashboard-your-manager-title" className="dashboard-your-manager__title">
          Your manager
        </h3>
        <p className="dashboard-your-manager__unavailable">
          Manager information unavailable
        </p>
      </section>
    );
  }

  const department = manager.department?.trim() || selfDepartment?.trim();

  return (
    <section
      className="dashboard-your-manager executive-panel"
      aria-labelledby="dashboard-your-manager-title"
      data-testid="dashboard-your-manager"
    >
      <h3 id="dashboard-your-manager-title" className="dashboard-your-manager__title">
        Your manager
      </h3>
      <div className="dashboard-your-manager__body">
        <PersonIdentity
          bambooEmployeeId={manager.id}
          displayName={manager.displayName}
          role={manager.jobTitle}
          secondary={department}
          avatarSize="lg"
        />
        {manager.workEmail ? (
          <Button
            variant="secondary"
            size="small"
            onClick={() => void openExternalUrl(`mailto:${manager.workEmail}`)}
            aria-label={`Email ${manager.displayName}`}
          >
            {manager.workEmail}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
