import { useMemo } from "react";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import { EntityLink } from "../../components/EntityLink/EntityLink";
import type { AppPreferences } from "../../platform/preferences";
import { resolveOrgRole } from "../../domain/organization/orgRole";
import {
  hasSupervisorReference,
  metrioWorkspaceLabel,
  resolveManagerEmployee,
  splitDepartmentLabel,
} from "./organizationIdentityModel";

export function OrganizationIdentitySettingsPanel({
  prefs,
}: {
  prefs: AppPreferences;
}) {
  const { currentUser } = useCurrentUser();
  const org = prefs.teamDetection?.ok ? prefs.teamDetection : null;

  const employee = org?.employee;
  const orgRoleState = useMemo(
    () => (org ? resolveOrgRole(org) : { ok: false as const, role: "unresolved", reason: "" }),
    [org],
  );
  const orgRole = orgRoleState.ok ? orgRoleState.role : "unresolved";
  const departmentParts = splitDepartmentLabel(employee?.department);
  const manager = org ? resolveManagerEmployee(org) : null;
  const supervisorKnownButMissing = org
    ? hasSupervisorReference(org) && !manager
    : false;

  if (!org?.ok || !employee) {
    return (
      <div className="settings-card__body" data-testid="organization-identity-settings">
        <p className="settings-field__hint">
          Organization identity is available after BambooHR sign-in and team detection.
        </p>
      </div>
    );
  }

  const displayName = currentUser?.person.name ?? employee.displayName;
  const jobTitle =
    currentUser?.jobTitle?.trim() || employee.jobTitle?.trim() || undefined;
  const position = employee.jobTitle?.trim() || undefined;
  const showPositionRow = Boolean(position && position !== jobTitle);

  return (
    <div className="settings-card__body" data-testid="organization-identity-settings">
      <div className="settings-identity-block">
        <PersonAvatar
          personId={employee.id}
          displayName={displayName}
          bambooEmployeeId={employee.id}
          size="lg"
        />
        <div className="settings-identity-block__text">
          <p className="settings-identity-block__name">{displayName}</p>
          {jobTitle ? (
            <p className="settings-identity-block__subtitle">{jobTitle}</p>
          ) : null}
        </div>
      </div>

      <hr className="settings-identity-divider" />

      <dl className="settings-identity-details">
        {departmentParts.department ? (
          <div className="settings-identity-details__row">
            <dt>Department</dt>
            <dd>{departmentParts.department}</dd>
          </div>
        ) : null}
        {departmentParts.team ? (
          <div className="settings-identity-details__row">
            <dt>Team</dt>
            <dd>{departmentParts.team}</dd>
          </div>
        ) : null}
        {showPositionRow ? (
          <div className="settings-identity-details__row">
            <dt>Position</dt>
            <dd>{position}</dd>
          </div>
        ) : null}
        <div className="settings-identity-details__row">
          <dt>Metrio access</dt>
          <dd>{metrioWorkspaceLabel(orgRole)}</dd>
        </div>
      </dl>

      <hr className="settings-identity-divider" />

      <section className="settings-identity-manager" aria-labelledby="settings-manager-title">
        <h4 id="settings-manager-title" className="settings-identity-manager__title">
          Manager
        </h4>
        {manager ? (
          <div className="settings-identity-manager__card">
            <PersonAvatar
              personId={manager.id}
              displayName={manager.displayName}
              bambooEmployeeId={manager.id}
              size="md"
            />
            <div className="settings-identity-manager__text">
              <p className="settings-identity-manager__name">{manager.displayName}</p>
              {manager.jobTitle?.trim() ? (
                <p className="settings-identity-manager__subtitle">
                  {manager.jobTitle.trim()}
                </p>
              ) : null}
              {manager.workEmail?.trim() ? (
                <EntityLink
                  href={`mailto:${manager.workEmail.trim()}`}
                  className="settings-identity-manager__contact"
                >
                  {manager.workEmail.trim()}
                </EntityLink>
              ) : null}
            </div>
          </div>
        ) : supervisorKnownButMissing ? (
          <p className="settings-field__hint">
            Manager is not available in the current organization roster.
          </p>
        ) : (
          <p className="settings-field__hint" data-testid="organization-no-manager">
            No manager in the current organization hierarchy
          </p>
        )}
      </section>
    </div>
  );
}
