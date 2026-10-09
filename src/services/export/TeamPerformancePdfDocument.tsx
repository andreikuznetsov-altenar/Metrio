import { Document, Image, Page, Svg, Line, Polyline, Text, View } from '@react-pdf/renderer';
import type { TeamPerformancePdfLayout } from './types';
import { sanitizePdfImageSrc } from './pdfSafeImage';
import { pdfStyles } from './pdfStyles';
import { AltenarPdfLogo } from './AltenarPdfLogo';

const TREND_ACCENT = '#0070F0';

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

function MiniTrendChart({ points }: { points: { date: string; value: number }[] }) {
  const usable = points.filter((point) => Number.isFinite(point.value));
  if (usable.length < 2) {
    return <Text style={pdfStyles.trendNoChart}>Insufficient chart data</Text>;
  }
  const width = 248;
  const height = 64;
  const padX = 8;
  const padY = 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const values = usable.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = usable.map((point, index) => {
    const x = padX + (index / (usable.length - 1)) * innerW;
    const y = padY + innerH - ((point.value - min) / span) * innerH;
    return `${Number.isFinite(x) ? x : padX},${Number.isFinite(y) ? y : height / 2}`;
  });
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line
        x1={padX}
        y1={height - padY}
        x2={width - padX}
        y2={height - padY}
        stroke="#e6e6e6"
        strokeWidth={1}
      />
      <Polyline
        points={coords.join(' ')}
        stroke={TREND_ACCENT}
        strokeWidth={1.25}
        fill="none"
      />
    </Svg>
  );
}

function DigestTable({ table }: { table: { title: string; rows: { label: string; value: string }[] } }) {
  return (
    <View style={pdfStyles.digestTable} wrap={false}>
      <Text style={pdfStyles.digestTableTitle}>{table.title}</Text>
      <View style={pdfStyles.digestTableHeader}>
        <Text style={pdfStyles.digestTableHeaderCell}>Item</Text>
        <Text style={pdfStyles.digestTableHeaderCellRight}>Value</Text>
      </View>
      {table.rows.map((row) => (
        <View key={`${table.title}-${row.label}`} style={pdfStyles.digestTableRow}>
          <Text style={pdfStyles.digestTableCell}>{row.label}</Text>
          <Text style={pdfStyles.digestTableCellRight}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function TeamPerformancePdfDocument({ layout }: { layout: TeamPerformancePdfLayout }) {
  const { hero, supporting } = layout.teamEfficiency;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.teamHeader} wrap={false}>
          <CompanyBrandMark layout={layout} />
          <Text style={pdfStyles.teamReportTitle}>{layout.teamName}</Text>
          <Text style={pdfStyles.teamReportDates}>{layout.reportRangeTitle}</Text>
        </View>

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
              <Text style={pdfStyles.efficiencyHeroValue}>{hero.value}</Text>
              <Text style={pdfStyles.efficiencyHeroLabel}>{hero.label}</Text>
              {hero.description ? (
                <Text style={pdfStyles.efficiencyHeroStatus}>{hero.description}</Text>
              ) : null}
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
                  <Text style={pdfStyles.individualEfficiencyValue}>{card.efficiency}</Text>
                  <View style={pdfStyles.individualMetricsRow}>
                    <Text style={pdfStyles.individualMetric}>First pass {card.firstPass}</Text>
                    <Text style={pdfStyles.individualMetric}>Completed {card.completed}</Text>
                    <Text style={pdfStyles.individualMetric}>Backflows {card.backflows}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={pdfStyles.sectionBlock} wrap={false}>
          <Text style={pdfStyles.sectionHeading}>Team digest</Text>
          <Text style={pdfStyles.digestSummary}>{layout.digestSummary}</Text>
          <DigestTable table={layout.digestRecentChanges} />
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
                <MiniTrendChart points={trend.chartPoints} />
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
              <Text style={pdfStyles.workloadSmallCol}>{row.workload}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
