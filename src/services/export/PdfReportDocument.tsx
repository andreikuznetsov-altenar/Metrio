import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { PerformanceExportPayload, PdfSection } from './types';
import { TeamPerformancePdfDocument } from './TeamPerformancePdfDocument';
import { pdfStyles } from './pdfStyles';

function SectionBlock({ section }: { section: PdfSection }) {
  const hasRows = section.rows && section.rows.length > 0;
  const hasKeyValues = section.keyValues && section.keyValues.length > 0;

  return (
    <View style={pdfStyles.section} wrap={false}>
      <Text style={pdfStyles.sectionTitle}>{section.title}</Text>
      {section.subtitle && <Text style={pdfStyles.sectionSubtitle}>{section.subtitle}</Text>}

      {hasKeyValues && (
        <View style={pdfStyles.cardBlock}>
          {section.keyValues!.map((row) => (
            <View key={row.label} style={pdfStyles.kvRow}>
              <Text style={pdfStyles.kvLabel}>{row.label}</Text>
              <Text style={pdfStyles.kvValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}

      {hasRows && section.rowHeaders && (
        <View style={pdfStyles.tableHeader}>
          {section.rowHeaders.map((header) => (
            <Text key={header} style={pdfStyles.tableHeaderCell}>{header}</Text>
          ))}
        </View>
      )}

      {hasRows &&
        section.rows!.map((row, index) => (
          <View key={`${section.title}-${index}`} style={pdfStyles.tableRow} wrap={false}>
            {row.cells.map((cell, cellIndex) => (
              <Text key={cellIndex} style={pdfStyles.tableCell}>{cell}</Text>
            ))}
          </View>
        ))}

      {!hasRows && !hasKeyValues && section.emptyText && (
        <Text style={pdfStyles.empty}>{section.emptyText}</Text>
      )}
    </View>
  );
}

export function PdfReportDocument({ payload }: { payload: PerformanceExportPayload }) {
  if (payload.teamLayout) {
    return <TeamPerformancePdfDocument layout={payload.teamLayout} />;
  }

  const { metadata } = payload;

  const metaItems = [
    { label: 'Report range', value: metadata.reportRange },
    { label: 'Generated', value: metadata.generatedAt },
    { label: 'Time zone', value: `${metadata.timezone} (${metadata.timezoneOffset})` },
    metadata.teamScope ? { label: 'Team scope', value: metadata.teamScope } : null,
    metadata.projects ? { label: 'Projects', value: metadata.projects } : null,
    { label: 'Target review days', value: String(metadata.targetReviewDays) },
    metadata.personName ? { label: 'Person', value: metadata.personName } : null,
    metadata.workHistoryGrouping
      ? { label: 'Grouping', value: metadata.workHistoryGrouping }
      : null,
    metadata.historyCoverage ? { label: 'History coverage', value: metadata.historyCoverage } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>{payload.reportTitle}</Text>
          <View style={pdfStyles.metaGrid}>
            {metaItems.map((item) => (
              <View key={item.label} style={pdfStyles.metaItem}>
                <Text style={pdfStyles.metaLabel}>{item.label}</Text>
                <Text style={pdfStyles.metaValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {payload.sections.map((section) => (
          <SectionBlock key={section.title} section={section} />
        ))}
      </Page>
    </Document>
  );
}
