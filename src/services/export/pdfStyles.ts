import { StyleSheet } from '@react-pdf/renderer';

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
    color: '#19191a',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    paddingBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 10,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    width: '45%',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 9,
    color: '#646568',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    color: '#19191a',
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: '#646568',
    marginBottom: 8,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    paddingVertical: 6,
  },
  kvLabel: {
    color: '#646568',
    flex: 1,
  },
  kvValue: {
    fontWeight: 700,
    textAlign: 'right',
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 9,
    color: '#646568',
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    paddingVertical: 5,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  empty: {
    fontSize: 9,
    color: '#646568',
    fontStyle: 'italic',
  },
  cardBlock: {
    marginBottom: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 4,
  },
});
