import { useMemo, useState } from "react";
import { useCompanyConfig } from "../../app/CompanyConfigContext";
import { buildDefaultCompanyConfig } from "../../domain/companyConfig/buildDefaultCompanyConfig";
import { isManagedField } from "../../domain/companyConfig/buildEffectiveConfig";
import { publishCompanyConfigToCloud } from "../../services/metrioCloud/metrioCloudClient";
import { isMetrioCloudConfigured } from "../../services/metrioCloud/metrioCloudClient";
import { Button } from "../../components/Button/Button";
import { Switch } from "../../components/Switch/Switch";

type AdminTab = "general" | "resources" | "onboarding" | "feedback" | "defaults" | "features";

export function CompanySettingsPanel({ embedded = false }: { embedded?: boolean }) {
  const { effective, cache, publishConfig, tryRemoteRefresh } = useCompanyConfig();
  const [tab, setTab] = useState<AdminTab>("general");
  const [draftFeatures, setDraftFeatures] = useState(effective.features);
  const [status, setStatus] = useState<string | null>(null);

  const previewResources = useMemo(
    () => effective.resources.slice(0, 8),
    [effective.resources],
  );

  if (!effective.isCompanyAdmin) {
    return (
      <section
        className={embedded ? "settings-card__body" : "settings-panel"}
        data-testid="company-config-readonly"
      >
        {!embedded ? <h2 className="settings-panel__title">Company</h2> : null}
        <p className="settings-panel__description">
          {effective.publicInfo.displayName}
        </p>
        <p className="settings-panel__hint">
          Enabled: {effective.publicInfo.enabledFeatures.join(" · ") || "—"}
        </p>
        {effective.publicInfo.supportUrl ? (
          <p className="settings-panel__hint">
            Support: {effective.publicInfo.supportUrl}
          </p>
        ) : null}
      </section>
    );
  }

  const publishToCloud = async () => {
    if (!isMetrioCloudConfigured()) {
      setStatus("Connect Metrio Cloud in Connections first.");
      return;
    }
    try {
      await publishCompanyConfigToCloud(cache.active);
      setStatus("Published to Metrio Cloud.");
    } catch {
      setStatus("Publish failed.");
    }
  };

  const saveFeatures = async () => {
    const next = {
      ...cache.active,
      features: draftFeatures,
      updatedAt: new Date().toISOString(),
      configVersion: `local-${Date.now()}`,
    };
    const result = await publishConfig(next, "Feature flags");
    setStatus(result.ok ? "Saved features." : result.errors.join(", "));
  };

  const resetBuiltin = async () => {
    const result = await publishConfig(buildDefaultCompanyConfig(), "Reset to builtin");
    setStatus(result.ok ? "Restored builtin defaults." : result.errors.join(", "));
  };

  return (
    <section
      className={embedded ? "settings-card__body" : "settings-panel"}
      data-testid="company-config-admin"
    >
      {!embedded ? <h2 className="settings-panel__title">Company configuration</h2> : null}
      <p className="settings-panel__description">
        v{effective.company.configVersion} · {effective.company.updatedAt}
      </p>
      <div className="settings-subnav">
        {(
          [
            ["general", "General"],
            ["resources", "Resources"],
            ["onboarding", "Onboarding"],
            ["feedback", "Feedback"],
            ["defaults", "Defaults"],
            ["features", "Features"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "settings-subnav__item--active" : "settings-subnav__item"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "general" ? (
        <div>
          <p>Display name: {effective.company.company.displayName}</p>
          <p>Config version: {cache.active.configVersion}</p>
          <Button variant="secondary" onClick={() => void tryRemoteRefresh()}>
            Refresh remote config
          </Button>
          {cache.lastRemoteError ? (
            <p className="settings-panel__hint">Remote: {cache.lastRemoteError}</p>
          ) : null}
        </div>
      ) : null}

      {tab === "resources" ? (
        <ul data-testid="company-resources-preview">
          {previewResources.map((r) => (
            <li key={r.id}>{r.title} · {r.audience}</li>
          ))}
        </ul>
      ) : null}

      {tab === "onboarding" ? (
        <p>
          New starter window: {effective.newStarterDays} days · Checklist items:{" "}
          {effective.checklistItems.length}
        </p>
      ) : null}

      {tab === "feedback" ? (
        <p>Templates: {effective.feedbackTemplates.length}</p>
      ) : null}

      {tab === "defaults" ? (
        <p>
          Review attention default:{" "}
          {effective.operationalRules.taskAttention.reviewAttentionDays} days
          {isManagedField(effective, "taskAttention.reviewAttentionDays")
            ? " (managed)"
            : " (user-overridable)"}
        </p>
      ) : null}

      {tab === "features" ? (
        <div className="settings-toggle-list">
          {(Object.keys(draftFeatures) as (keyof typeof draftFeatures)[]).map((key) => (
            <label key={key} className="settings-toggle-row">
              <span>{key}</span>
              <Switch
                checked={draftFeatures[key]}
                onCheckedChange={(checked) =>
                  setDraftFeatures((prev) => ({ ...prev, [key]: checked }))
                }
              />
            </label>
          ))}
          <Button variant="primary" onClick={() => void saveFeatures()}>
            Save features
          </Button>
        </div>
      ) : null}

      <div className="settings-panel__actions">
        <Button variant="secondary" onClick={() => void publishToCloud()}>
          Publish to Metrio Cloud
        </Button>
        <Button variant="ghost" onClick={() => void resetBuiltin()}>
          Restore builtin defaults
        </Button>
      </div>
      {status ? <p className="settings-panel__hint">{status}</p> : null}
    </section>
  );
}
