import { describe, expect, it } from 'vitest';
import {
  buildResponseSyncFilter,
  extractLastSyncAtFromGoogleFormsFilter,
  toGoogleFormsUtcTimestamp,
} from './syncFilter';
import { mergeResponses } from './responses';

describe('response sync filter', () => {
  it('normalizes timestamps to RFC3339 Z', () => {
    expect(toGoogleFormsUtcTimestamp('2025-01-01T12:00:00.000Z')).toBe('2025-01-01T12:00:00Z');
  });

  it('uses >= with overlap for incremental sync', () => {
    const filter = buildResponseSyncFilter('2025-01-01T12:00:00.000Z');
    expect(filter).toMatch(/^timestamp >= /);
    expect(filter).toContain('Z');
    expect(extractLastSyncAtFromGoogleFormsFilter(filter)).toBe('2025-01-01T11:59:59Z');
  });

  it('extracts RFC3339 timestamp for Apps Script lastSyncAt', () => {
    expect(
      extractLastSyncAtFromGoogleFormsFilter('timestamp >= 2026-09-29T10:00:00Z'),
    ).toBe('2026-09-29T10:00:00Z');
  });

  it('returns null when no filter is provided', () => {
    expect(extractLastSyncAtFromGoogleFormsFilter(undefined)).toBeNull();
    expect(extractLastSyncAtFromGoogleFormsFilter('')).toBeNull();
  });

  it('returns null for invalid filter strings instead of malformed dates', () => {
    expect(extractLastSyncAtFromGoogleFormsFilter('timestamp >= not-a-date')).toBeNull();
    expect(extractLastSyncAtFromGoogleFormsFilter('invalid filter')).toBeNull();
  });

  it('dedupes overlapping incremental responses by responseId', () => {
    const existing = [
      {
        responseId: 'r1',
        createTime: '2025-01-01T12:00:00Z',
        lastSubmittedTime: '2025-01-01T12:00:00Z',
        answers: [],
      },
    ];
    const incoming = [
      {
        responseId: 'r1',
        createTime: '2025-01-01T12:00:00Z',
        lastSubmittedTime: '2025-01-01T12:00:01Z',
        answers: [],
      },
      {
        responseId: 'r2',
        createTime: '2025-01-01T12:00:02Z',
        lastSubmittedTime: '2025-01-01T12:00:02Z',
        answers: [],
      },
    ];
    const merged = mergeResponses(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.responseId === 'r1')?.lastSubmittedTime).toBe(
      '2025-01-01T12:00:01Z',
    );
  });
});
