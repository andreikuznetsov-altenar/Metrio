import { PersonAvatar } from "../../../components/PersonAvatar/PersonAvatar";
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
        className="dashboard-your-manager module-surface"
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
      className="dashboard-your-manager module-surface"
      aria-labelledby="dashboard-your-manager-title"
      data-testid="dashboard-your-manager"
    >
      <h3 id="dashboard-your-manager-title" className="dashboard-your-manager__title">
        Your manager
      </h3>
      <div className="dashboard-your-manager__body">
        <PersonAvatar
          bambooEmployeeId={manager.id}
          displayName={manager.displayName}
          size="lg"
        />
        <div className="dashboard-your-manager__details">
          <div className="dashboard-your-manager__name">{manager.displayName}</div>
          {manager.jobTitle ? (
            <div className="dashboard-your-manager__meta">{manager.jobTitle}</div>
          ) : null}
          {department ? (
            <div className="dashboard-your-manager__meta">{department}</div>
          ) : null}
          {manager.workEmail ? (
            <a className="dashboard-your-manager__link" href={`mailto:${manager.workEmail}`}>
              {manager.workEmail}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
