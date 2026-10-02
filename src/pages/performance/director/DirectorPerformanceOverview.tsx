import { useEffect, useMemo, useState } from "react";
import { usePerformanceData } from "../../../app/PerformanceDataContext";
import { useCurrentUser } from "../../../app/CurrentUserContext";
import { useFeedbackSurveyStore } from "../../../app/feedbackSurveyStore";
import {
  readPersistedDirectorPerformanceView,
  writePersistedDirectorPerformanceView,
} from "../../../app/directorViewPersistence";
import { navigateOrganizationSignalTarget } from "../../../app/organizationSignalNavigation";
import type { DirectorPerformanceView } from "../../../domain/performance";
import { summarizeFeedbackActions } from "../../../domain/feedback/feedbackActionSummary";
import { resolveAuthorizedPeopleScope } from "../../../domain/organization/authorizedPeopleScope";
import {
  buildOrganizationModel,
  filterDeliveryRiskForTeam,
} from "../../../domain/organization/buildOrganizationModel";
import { groupPersonsByTeam } from "../../../domain/organization/teamGrouping";
import type { OrganizationSignal } from "../../../domain/organization/organizationTypes";
import type { OrgResolutionResult } from "../../../services/bamboo/orgResolver";
import { loadPreferences } from "../../../platform/preferences";
import { PerformanceStatusBanner } from "../PerformanceStatusBanner";
import { DirectorDeliveryView } from "./DirectorDeliveryView";
import { DirectorOverviewView } from "./DirectorOverviewView";
import { DirectorPerformanceSubnav } from "./DirectorPerformanceSubnav";
import { DirectorSignalsView } from "./DirectorSignalsView";
import { DirectorTeamsView } from "./DirectorTeamsView";
import "../performance-dashboard.css";

export interface DirectorPerformanceOverviewProps {
  onOpenPerson: (personId: string) => void;
}

export function DirectorPerformanceOverview({
  onOpenPerson,
}: DirectorPerformanceOverviewProps) {
  const [activeView, setActiveView] = useState<DirectorPerformanceView>(
    () => readPersistedDirectorPerformanceView(),
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const [deliveryTeamId, setDeliveryTeamId] = useState<string | undefined>();
  const [deliveryFilter, setDeliveryFilter] = useState<"review" | "all">("all");
  const [org, setOrg] = useState<OrgResolutionResult | null>(null);

  const { data, uiState } = usePerformanceData();
  const { currentUser } = useCurrentUser();
  const surveyData = useFeedbackSurveyStore((state) => state.data);

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setOrg(prefs.teamDetection ?? null);
    });
  }, [data?.lastUpdatedAt]);

  const model = useMemo(() => {
    if (!data || !org?.ok) return null;
    const scope = resolveAuthorizedPeopleScope(org, currentUser.person.role);
    return buildOrganizationModel({
      snapshot: data.teamSnapshot,
      params: data.reportParams,
      scope,
      feedback: summarizeFeedbackActions(surveyData),
    });
  }, [data, org, currentUser.person.role, surveyData]);

  const deliveryRows = useMemo(() => {
    if (!model) return [];
    if (!deliveryTeamId) return model.deliveryRisk;
    const team = groupPersonsByTeam(
      data?.teamSnapshot.persons.filter((person) =>
        model.scope.personIds.includes(person.id),
      ) ?? [],
    ).find((group) => group.teamId === deliveryTeamId);
    if (!team) return model.deliveryRisk;
    const personIds = new Set(team.persons.map((person) => person.id));
    return filterDeliveryRiskForTeam(
      model.deliveryRisk,
      personIds,
      deliveryFilter,
    );
  }, [model, deliveryTeamId, deliveryFilter, data]);

  const deliveryFilterLabel = useMemo(() => {
    if (!deliveryTeamId || !model) return undefined;
    const team = model.teams.find((row) => row.teamId === deliveryTeamId);
    if (!team) return undefined;
    return deliveryFilter === "review"
      ? `${team.teamName} · Review`
      : team.teamName;
  }, [deliveryTeamId, deliveryFilter, model]);

  const openSignal = (signal: OrganizationSignal) => {
    navigateOrganizationSignalTarget(signal.target, {
      setDirectorView: (view) => {
        writePersistedDirectorPerformanceView(view);
        setActiveView(view);
      },
      setDeliveryTeamFilter: (teamId, filter) => {
        setDeliveryTeamId(teamId);
        setDeliveryFilter(filter ?? "all");
      },
      setSelectedTeamId,
      openPerson: onOpenPerson,
    });
  };

  if (!model && uiState === "initial-loading") {
    return (
      <div className="performance-dashboard">
        <PerformanceStatusBanner />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="performance-dashboard">
        <PerformanceStatusBanner />
        <p className="performance-inline-empty">No organization data in this period.</p>
      </div>
    );
  }

  return (
    <div className="performance-dashboard" data-testid="performance-dashboard-ready">
      <PerformanceStatusBanner />
      <DirectorPerformanceSubnav
        activeView={activeView}
        onChange={(view) => {
          writePersistedDirectorPerformanceView(view);
          setActiveView(view);
        }}
      />

      {activeView === "overview" ? (
        <DirectorOverviewView
          model={model}
          onOpenSignal={openSignal}
          onOpenTeams={() => {
            writePersistedDirectorPerformanceView("teams");
            setActiveView("teams");
          }}
        />
      ) : null}

      {activeView === "teams" ? (
        <DirectorTeamsView
          teams={model.teams}
          selectedTeamId={selectedTeamId}
          onSelectTeam={setSelectedTeamId}
          onBack={() => setSelectedTeamId(undefined)}
        />
      ) : null}

      {activeView === "signals" ? (
        <DirectorSignalsView signals={model.signals} onOpen={openSignal} />
      ) : null}

      {activeView === "delivery" ? (
        <DirectorDeliveryView
          deliveryRisk={deliveryRows}
          teamFilterLabel={deliveryFilterLabel}
          onOpenPerson={onOpenPerson}
        />
      ) : null}
    </div>
  );
}
