import { Badge } from "../../components/Badge/Badge";
import { EntityLink } from "../../components/EntityLink/EntityLink";
import { COMPANY_CONFIG } from "../../config/company";
import type { EffectiveConfig } from "../../domain/companyConfig/buildEffectiveConfig";

function formatFeatureLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function CompanyReadonlySummary({
  publicInfo,
}: {
  publicInfo: EffectiveConfig["publicInfo"];
}) {
  const websiteUrl = COMPANY_CONFIG.companyWebsiteUrl;
  const features = publicInfo.enabledFeatures.filter(Boolean);

  return (
    <div className="settings-meta-list" data-testid="company-readonly-summary">
      <div className="settings-meta-row">
        <span className="settings-meta-row__label">Company</span>
        <span className="settings-meta-row__value">{publicInfo.displayName}</span>
      </div>
      <div className="settings-meta-row">
        <span className="settings-meta-row__label">Website</span>
        <span className="settings-meta-row__value">
          <EntityLink href={websiteUrl}>Altenar website</EntityLink>
        </span>
      </div>
      {features.length > 0 ? (
        <div className="settings-meta-row settings-meta-row--stacked">
          <span className="settings-meta-row__label">Enabled features</span>
          <div className="settings-feature-badges">
            {features.map((feature) => (
              <Badge key={feature} variant="neutral">
                {formatFeatureLabel(feature)}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
