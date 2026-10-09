import {
  Document,
  Image,
  Page,
  Polygon,
  Svg,
  Line,
  Polyline,
  Text,
  View,
} from '@react-pdf/renderer';
import type { TeamPerformancePdfLayout } from './types';
import { sanitizePdfImageSrc } from './pdfSafeImage';
import { PDF_COLORS, pdfStyles } from './pdfStyles';
import { AltenarPdfLogo } from './AltenarPdfLogo';
import { buildTrendChartGeometry, polylineFromPoints } from './teamPdfChart';
import { pdfWorkloadTone } from './teamPdfHelpers';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function CompanyBrandMark({ layout }: { layout: TeamPerformancePdfLayout }) {
  if (!layout.useVectorLogo) {
    const safeLogo = sanitizePdfImageSrc(layout.companyLogoSrc);
    if (safeLogo) {
      return <Image src={safeLogo} style={pdfStyles.companyLogo} />;
    }
  }
  return <AltenarPdfLogo />;
}

function PersonAvatar({
  name,
  avatarDataUrl,
}: {
  name: string;
  avatarDataUrl?: string | null;
}) {
  const safeAvatar = sanitizePdfImageSrc(avatarDataUrl);
  if (safeAvatar) {
    return <Image src={safeAvatar} style={pdfStyles.avatar} />;
  }
  return (
    <View style={pdfStyles.avatarFallback}>
      <Text style={pdfStyles.avatarFallbackText}>{initialsFromName(name)}</Text>
    </View>
  );
}

function TeamReportHeader({ layout }: { layout: TeamPerformancePdfLayout }) {
  return (
    <View style={pdfStyles.teamHeader} wrap={false}>
      <CompanyBrandMark layout={layout} />
      <Text style={pdfStyles.teamReportTitle}>{layout.teamName}</Text>
      <Text style={pdfStyles.teamReportDates}>{layout.reportRangeTitle}</Text>
    </View>
  );
}

function SmoothTrendChart({ points }: { points: { date: string; value: number }[] }) {
  const usable = points.filter((point) => Number.isFinite(point.value));
  if (usable.length < 2) {
    return <Text style={pdfStyles.trendNoChart}>Insufficient chart data</Text>;
  }
  const width = 248;
  const height = 72;
  const values = usable.map((p) => p.value);
  const geometry = buildTrendChartGeometry(values, width, height, 10, 12);
  if (!geometry) {
    return <Text style={pdfStyles.trendNoChart}>Insufficient chart data</Text>;
  }
  const areaPoints = polylineFromPoints(geometry.areaPoints);
  const linePoints = polylineFromPoints(geometry.linePoints);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={10}
        y1={geometry.baselineY}
        x2={width - 10}
        y2={geometry.baselineY}
        stroke={PDF_COLORS.borderSubtle}
        strokeWidth={0.75}
      />
      <Polygon points={areaPoints} fill={PDF_COLORS.accentSoft} stroke="none" />
      <Polyline
        points={linePoints}
        stroke={PDF_COLORS.accent}
        strokeWidth={1.25}
        fill="none"
      />
    </Svg>
  );
}

function workloadTextStyle(label: string) {
  const tone = pdfWorkloadTone(label);
  if (tone === 'danger') return pdfStyles.workloadToneDanger;
  if (tone === 'warning') return pdfStyles.workloadToneWarning;
  if (tone === 'success') return pdfStyles.workloadToneSuccess;
  return pdfStyles.workloadSmallCol;
}

export function TeamPerformancePdfDocument({ layout }: { layout: TeamPerformancePdfLayout }) {
  const { hero, supporting } = layout.teamEfficiency;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <TeamReportHeader layout={layout} />

        <View style={pdfStyles.sectionBlock} wrap={false}>
          <Text style={pdfStyles.sectionHeading}>Team</Text>
          <View style={pdfStyles.rosterGrid}>
            {layout.roster.map((member) => (
              <View key={member.personId} style={pdfStyles.rosterCard} wrap={false}>
                <PersonAvatar name={member.name} avatarDataUrl={member.avatarDataUrl} />
                <View style={pdfStyles.rosterText}>
                  <Text style={pdfStyles.rosterName}>{member.name}</Text>
                  <Text style={pdfStyles.rosterRole}>{member.jobTitle}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={pdfStyles.sectionBlock} wrap={false}>
          <Text style={pdfStyles.sectionHeading}>Team efficiency</Text>
          <View style={pdfStyles.efficiencyHeroRow}>
            <View style={pdfStyles.efficiencyHeroCard} wrap={false}>
              <View>
                <Text style={pdfStyles.efficiencyHeroValue}>{hero.value}</Text>
                <Text style={pdfStyles.efficiencyHeroLabel}>{hero.label}</Text>
                {hero.description ? (
                  <Text style={pdfStyles.efficiencyHeroStatus}>{hero.description}</Text>
                ) : null}
              </View>
              {hero.comparison ? (
                <Text style={pdfStyles.kpiComparison}>{hero.comparison}</Text>
              ) : null}
            </View>
            <View style={pdfStyles.efficiencySupportGrid}>
              {supporting.map((kpi) => (
                <View key={kpi.label} style={pdfStyles.efficiencySupportCard} wrap={false}>
                  <Text style={pdfStyles.efficiencySupportValue}>{kpi.value}</Text>
                  <Text style={pdfStyles.efficiencySupportLabel}>{kpi.label}</Text>
                  {kpi.comparison ? (
                    <Text style={pdfStyles.kpiComparison}>{kpi.comparison}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </View>

        {layout.individualEfficiency.length > 0 ? (
          <View style={pdfStyles.sectionBlock}>
            <Text style={pdfStyles.sectionHeading}>Individual efficiency</Text>
            <View style={pdfStyles.individualGrid}>
              {layout.individualEfficiency.map((card) => (
                <View key={card.personId} style={pdfStyles.individualCard} wrap={false}>
                  <View style={pdfStyles.individualCardHeader}>
                    <PersonAvatar name={card.name} avatarDataUrl={card.avatarDataUrl} />
                    <View style={pdfStyles.rosterText}>
                      <Text style={pdfStyles.rosterName}>{card.name}</Text>
                      <Text style={pdfStyles.rosterRole}>{card.jobTitle}</Text>
                    </View>
                  </View>
                  <View style={pdfStyles.individualEfficiencyRow}>
                    <Text style={pdfStyles.individualEfficiencyValue}>{card.efficiency}</Text>
                    <Text style={pdfStyles.individualEfficiencyCaption}>Efficiency</Text>
                  </View>
                  <View style={pdfStyles.individualMetricsRow}>
                    <View style={pdfStyles.individualMetricRow}>
                      <Text style={pdfStyles.individualMetricLabel}>First pass</Text>
                      <Text style={pdfStyles.individualMetricValue}>{card.firstPass}</Text>
                    </View>
                    <View style={pdfStyles.individualMetricRow}>
                      <Text style={pdfStyles.individualMetricLabel}>Completed</Text>
                      <Text style={pdfStyles.individualMetricValue}>{card.completed}</Text>
                    </View>
                    <View style={pdfStyles.individualMetricRow}>
                      <Text style={pdfStyles.individualMetricLabel}>Backflows</Text>
                      <Text style={pdfStyles.individualMetricValue}>{card.backflows}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.sectionBlock} wrap={false}>
          <Text style={pdfStyles.sectionHeading}>Team digest</Text>
          <Text style={pdfStyles.digestSummary}>{layout.digestSummary}</Text>
        </View>

        <View style={pdfStyles.sectionBlock}>
          <Text style={pdfStyles.sectionHeading}>Team trends</Text>
          <View style={pdfStyles.trendGrid}>
            {layout.teamTrends.map((trend) => (
              <View key={trend.label} style={pdfStyles.trendGridItem} wrap={false}>
                <View style={pdfStyles.trendHead}>
                  <Text style={pdfStyles.trendLabel}>{trend.label}</Text>
                  <View>
                    <Text style={pdfStyles.trendValue}>{trend.value}</Text>
                    {trend.comparison ? (
                      <Text style={pdfStyles.trendDelta}>{trend.comparison}</Text>
                    ) : null}
                  </View>
                </View>
                <SmoothTrendChart points={trend.chartPoints} />
              </View>
            ))}
          </View>
        </View>

        <View style={pdfStyles.sectionBlock}>
          <Text style={pdfStyles.sectionHeading}>Workload balance</Text>
          {layout.workloadBalance.subtitle ? (
            <Text style={pdfStyles.sectionLead}>{layout.workloadBalance.subtitle}</Text>
          ) : null}
          <View style={pdfStyles.tableHeaderMuted}>
            <Text style={pdfStyles.workloadCol}>Person</Text>
            <Text style={pdfStyles.workloadSmallCol}>Active</Text>
            <Text style={pdfStyles.workloadSmallCol}>At risk</Text>
            <Text style={pdfStyles.workloadSmallCol}>Workload</Text>
          </View>
          {layout.workloadBalance.rows.map((row) => (
            <View key={row.personId} style={pdfStyles.tableRowMuted} wrap={false}>
              <Text style={pdfStyles.workloadCol}>{row.personName}</Text>
              <Text style={pdfStyles.workloadSmallCol}>{row.active}</Text>
              <Text style={pdfStyles.workloadSmallCol}>{row.atRisk}</Text>
              <Text style={workloadTextStyle(row.workload)}>{row.workload}</Text>
            </View>
          ))}
        </View>
      </Page>

      {layout.deliveryRiskDetails.rows.length > 0 ? (
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.sectionBlock}>
            <Text style={pdfStyles.sectionHeading}>Delivery risk details</Text>
            <Text style={pdfStyles.sectionLead}>{layout.deliveryRiskDetails.subtitle}</Text>
            <View style={pdfStyles.deliveryRiskHeader} wrap={false}>
              <Text style={[pdfStyles.deliveryRiskHeaderCell, pdfStyles.deliveryRiskColIssue]}>
                Issue
              </Text>
              <Text style={[pdfStyles.deliveryRiskHeaderCell, pdfStyles.deliveryRiskColOwner]}>
                Owner
              </Text>
              <Text style={[pdfStyles.deliveryRiskHeaderCell, pdfStyles.deliveryRiskColStatus]}>
                Status
              </Text>
              <Text style={[pdfStyles.deliveryRiskHeaderCell, pdfStyles.deliveryRiskColAge]}>
                Age
              </Text>
              <Text style={[pdfStyles.deliveryRiskHeaderCell, pdfStyles.deliveryRiskColReason]}>
                Reason
              </Text>
              <Text style={[pdfStyles.deliveryRiskHeaderCell, pdfStyles.deliveryRiskColPath]}>
                Path
              </Text>
            </View>
            {layout.deliveryRiskDetails.rows.map((row) => (
              <View key={row.issueKey} style={pdfStyles.deliveryRiskRow} wrap={false}>
                <Text style={pdfStyles.deliveryRiskColIssue}>{row.issueKey}</Text>
                <Text style={pdfStyles.deliveryRiskColOwner}>{row.ownerName}</Text>
                <Text style={pdfStyles.deliveryRiskColStatus}>{row.status}</Text>
                <Text style={pdfStyles.deliveryRiskColAge}>{row.stageAge}</Text>
                <Text style={pdfStyles.deliveryRiskColReason}>{row.reason}</Text>
                <Text style={pdfStyles.deliveryRiskColPath}>{row.path}</Text>
              </View>
            ))}
            {layout.deliveryRiskDetails.overflowLabel ? (
              <Text style={pdfStyles.sectionLead}>{layout.deliveryRiskDetails.overflowLabel}</Text>
            ) : null}
          </View>
        </Page>
      ) : null}
    </Document>
  );
}
