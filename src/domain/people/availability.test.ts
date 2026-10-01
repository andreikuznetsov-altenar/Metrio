import { describe, expect, it } from 'vitest';
import { addDays, format } from 'date-fns';
import { classifyAvailability, pickRelevantTimeOff } from './availability';

const today = new Date('2025-09-24T12:00:00');

describe('classifyAvailability', () => {
  it('marks currently away as on_vacation', () => {
    const result = classifyAvailability(
      { type: 'Vacation', start: '2025-09-22', end: '2025-09-27' },
      today,
    );
    expect(result.state).toBe('on_vacation');
    expect(result.label).toContain('Vacation');
  });

  it('marks vacation starting tomorrow', () => {
    const tomorrow = format(addDays(today, 1), 'yyyy-MM-dd');
    const result = classifyAvailability(
      { type: 'Vacation', start: tomorrow, end: format(addDays(today, 5), 'yyyy-MM-dd') },
      today,
    );
    expect(result.state).toBe('vacation_tomorrow');
  });

  it('marks future vacation within 7 days as vacation_soon', () => {
    const result = classifyAvailability(
      { type: 'Vacation', start: '2025-09-28', end: '2025-10-02' },
      today,
    );
    expect(result.state).toBe('vacation_soon');
  });

  it('marks returns today', () => {
    const result = classifyAvailability(
      { type: 'Vacation', start: '2025-09-20', end: '2025-09-23' },
      today,
    );
    expect(result.state).toBe('returns_today');
  });

  it('models holidays separately', () => {
    const result = classifyAvailability(
      { type: 'Company Holiday', start: '2025-09-24', end: '2025-09-24' },
      today,
    );
    expect(result.isHoliday).toBe(true);
    expect(result.state).toBe('on_vacation');
  });
});

describe('pickRelevantTimeOff', () => {
  it('prefers active absence over upcoming', () => {
    const entries = [
      { employeeId: '1', type: 'Vacation', start: '2025-10-01', end: '2025-10-05' },
      { employeeId: '1', type: 'Vacation', start: '2025-09-20', end: '2025-09-27' },
    ];
    const picked = pickRelevantTimeOff(entries, '1', today);
    expect(picked?.start).toBe('2025-09-20');
  });
});
