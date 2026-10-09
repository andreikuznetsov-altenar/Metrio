import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePersonNavigation } from "../../app/PersonNavigationContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import { EntityLink } from "../../components/EntityLink/EntityLink";
import { canOpenPersonDetail } from "../../domain/personAccess";
import { getWorkEmail, type AppPreferences } from "../../platform/preferences";
import { BambooClient } from "../../services/bamboo/bambooClient";
import { detectTeam } from "../../services/bamboo/teamDetection";
import type { OrgResolutionResult } from "../../services/bamboo/orgResolver";
import { resolveOrgRole } from "../../domain/organization/orgRole";
import {
  hasSupervisorReference,
  metrioWorkspaceLabel,
  NO_BAMBOO_MANAGER_COPY,
  resolveManagerEmployee,
  splitDepartmentLabel,
} from "./organizationIdentityModel";

export function OrganizationIdentitySettingsPanel({
  prefs,
  onPrefsUpdated,
}: {
  prefs: AppPreferences;
  onPrefsUpdated?: (next: AppPreferences) => void;
}) {
  const { currentUser } = useCurrentUser();
  const { openPerson } = usePersonNavigation();
  const { data: performanceData } = usePerformanceData();
  const enrichAttempted = useRef(false);
  const [orgOverride, setOrgOverride] = useState<OrgResolutionResult | null>(
    null,
  );

  const orgFromPrefs = prefs.teamDetection?.ok ? prefs.teamDetection : null;
  const org = orgOverride?.ok ? orgOverride : orgFromPrefs;

  useEffect(() => {
    if (enrichAttempted.current) return;
    if (!orgFromPrefs?.ok || !orgFromPrefs.employee) return;
    if (orgFromPrefs.manager?.id) return;
    const subdomain = prefs.bambooSubdomain?.trim();
    const workEmail = getWorkEmail(prefs);
    if (!subdomain || !workEmail) return;

    enrichAttempted.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const client = new BambooClient({ subdomain });
        const next = await detectTeam(client, workEmail);
        if (cancelled) return;
        // Temporary Bamboo failure: keep cached teamDetection (manager/photo).
        if (!next.ok) return;

        setOrgOverride(next);
        onPrefsUpdated?.({ ...prefs, teamDetection: next });
      } catch {
        // Preserve existing cached manager / identity on outage.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgFromPrefs, prefs, onPrefsUpdated]);

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

  const managerMetrioPersonId = useMemo(() => {
    if (!manager?.id || !performanceData?.teamSnapshot?.persons) {
      return null;
    }
    const match = performanceData.teamSnapshot.persons.find(
      (person) =>
        person.id === manager.id || person.bamboo?.id === manager.id,
    );
    return match?.id ?? null;
  }, [manager, performanceData?.teamSnapshot?.persons]);

  const managerOpenable = Boolean(
    managerMetrioPersonId &&
      canOpenPersonDetail(currentUser, managerMetrioPersonId),
  );

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
          <div
            className={
              managerOpenable
                ? "settings-identity-manager__card settings-identity-manager__card--interactive"
                : "settings-identity-manager__card"
            }
            data-testid="organization-manager-card"
            {...(managerOpenable
              ? {
                  role: "button",
                  tabIndex: 0,
                  onClick: () =>
                    openPerson(managerMetrioPersonId!, "overview", {
                      view: "profile",
                    }),
                  onKeyDown: (event: KeyboardEvent) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openPerson(managerMetrioPersonId!, "overview", {
                        view: "profile",
                      });
                    }
                  },
                }
              : {})}
          >
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
                <span
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <EntityLink
                    href={`mailto:${manager.workEmail.trim()}`}
                    className="settings-identity-manager__contact"
                  >
                    {manager.workEmail.trim()}
                  </EntityLink>
                </span>
              ) : null}
            </div>
          </div>
        ) : supervisorKnownButMissing ? (
          <p className="settings-field__hint">
            Manager is listed in BambooHR but could not be resolved.
          </p>
        ) : (
          <p className="settings-field__hint" data-testid="organization-no-manager">
            {NO_BAMBOO_MANAGER_COPY}
          </p>
        )}
      </section>
    </div>
  );
}
