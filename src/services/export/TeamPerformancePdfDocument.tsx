import { Document, Image, Page, Svg, Line, Polyline, Text, View } from '@react-pdf/renderer';
import type { TeamPerformancePdfLayout } from './types';
import { pdfStyles } from './pdfStyles';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function MiniTrendChart({ points }: { points: { date: string; value: number }[] }) {
  if (points.length < 2) {
    return <Text style={pdfStyles.trendNoChart}>Insufficient chart data</Text>;
  }
  const width = 220;
  const height = 56;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point.value - min) / span) * (height - 8) - 4;
    return `${x},${y}`;
  });
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={0} y1={height - 1} x2={width} y2={height - 1} stroke="#e6e6e6" strokeWidth={1} />
      <Polyline points={coords.join(' ')} stroke="#0B3D2E" strokeWidth={2} fill="none" />
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
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.teamHeader} wrap={false}>
          {layout.companyLogoSrc ? (
            <Image src={layout.companyLogoSrc} style={pdfStyles.companyLogo} />
          ) : null}
          <Text style={pdfStyles.teamReportTitle}>Team Performance Report</Text>
          <Text style={pdfStyles.teamReportDates}>{layout.reportRangeTitle}</Text>
        </View>

        <View style={pdfStyles.sectionBlock} wrap={false}>
          <Text style={pdfStyles.sectionHeading}>KPI Overview</Text>
          <View style={pdfStyles.kpiGrid}>
            {layout.kpiOverview.map((kpi) => (
              <View key={kpi.label} style={pdfStyles.kpiCard} wrap={false}>
                <Text style={pdfStyles.kpiValue}>{kpi.value}</Text>
                <Text style={pdfStyles.kpiLabel}>{kpi.label}</Text>
                {kpi.comparison ? (
                  <Text style={pdfStyles.kpiComparison}>{kpi.comparison}</Text>
                ) : null}
                {kpi.description ? (
                  <Text style={pdfStyles.kpiDescription}>{kpi.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View style={pdfStyles.sectionBlock} wrap={false}>
          <Text style={pdfStyles.sectionHeading}>Team Digest</Text>
          <Text style={pdfStyles.digestSummary}>{layout.digestSummary}</Text>
          <View style={pdfStyles.digestColumns}>
            <DigestTable table={layout.digestAttention} />
            <DigestTable table={layout.digestRecentChanges} />
          </View>
        </View>

        <View style={pdfStyles.sectionBlock}>
          <Text style={pdfStyles.sectionHeading}>Team Attention</Text>
          {layout.teamAttention.subtitle ? (
            <Text style={pdfStyles.sectionLead}>{layout.teamAttention.subtitle}</Text>
          ) : null}
          <View style={pdfStyles.tableHeaderMuted}>
            <Text style={pdfStyles.attentionPersonCol}>Person</Text>
            <Text style={pdfStyles.attentionCol}>Attention</Text>
            <Text style={pdfStyles.attentionSmallCol}>Issues</Text>
            <Text style={pdfStyles.attentionSmallCol}>Severity</Text>
            <Text style={pdfStyles.attentionSmallCol}>Workload</Text>
          </View>
          {layout.teamAttention.rows.map((row) => (
            <View key={row.personId} style={pdfStyles.tableRowMuted} wrap={false}>
              <View style={pdfStyles.attentionPersonCol}>
                {row.avatarDataUrl ? (
                  <Image src={row.avatarDataUrl} style={pdfStyles.avatar} />
                ) : (
                  <View style={pdfStyles.avatarFallback}>
                    <Text style={pdfStyles.avatarFallbackText}>{initialsFromName(row.personName)}</Text>
                  </View>
                )}
                <Text style={pdfStyles.attentionPersonName}>{row.personName}</Text>
              </View>
              <Text style={pdfStyles.attentionCol}>{row.attention}</Text>
              <Text style={pdfStyles.attentionSmallCol}>{row.issues}</Text>
              <Text style={pdfStyles.attentionSmallCol}>{row.severity}</Text>
              <Text style={pdfStyles.attentionSmallCol}>{row.workload}</Text>
            </View>
          ))}
        </View>

        <View style={pdfStyles.sectionBlock}>
          <Text style={pdfStyles.sectionHeading}>Team Trends</Text>
          {layout.teamTrends.map((trend) => (
            <View key={trend.label} style={pdfStyles.trendCard} wrap={false}>
              <View style={pdfStyles.trendHead}>
                <Text style={pdfStyles.trendLabel}>{trend.label}</Text>
                <Text style={pdfStyles.trendValue}>{trend.value}</Text>
              </View>
              <MiniTrendChart points={trend.chartPoints} />
            </View>
          ))}
        </View>

        <View style={pdfStyles.sectionBlock}>
          <Text style={pdfStyles.sectionHeading}>Workload Balance</Text>
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
            <View key={row.personName} style={pdfStyles.tableRowMuted} wrap={false}>
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
