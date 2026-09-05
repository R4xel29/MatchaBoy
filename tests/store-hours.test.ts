import { describe, it, expect } from './test-framework';
import { 
  checkStoreOperationalStatus, 
  getEffectiveStoreHours, 
  getJakartaNow, 
  timeStringToMinutes 
} from '../src/lib/store-hours';

describe('Store Hours & SPMB Operational Validation', () => {
  it('should parse HH:mm strings correctly to minutes', () => {
    expect(timeStringToMinutes('08:00')).toBe(480);
    expect(timeStringToMinutes('15:30')).toBe(930);
    expect(timeStringToMinutes('22:00')).toBe(1320);
    expect(timeStringToMinutes('00:00')).toBe(0);
    expect(timeStringToMinutes('')).toBe(0);
  });

  it('should get current Jakarta time with correct components', () => {
    const now = getJakartaNow();
    expect(typeof now.dateStr).toBe('string');
    expect(now.dateStr).toContain('-');
    expect(typeof now.timeStr).toBe('string');
    expect(now.timeStr).toContain(':');
    expect(now.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(now.dayOfWeek).toBeLessThanOrEqual(6);
    expect(now.currentMinutes).toBeGreaterThanOrEqual(0);
    expect(now.currentMinutes).toBeLessThan(1440);
  });

  it('should correctly flag a store as closed on a weekly day off', () => {
    const now = getJakartaNow();
    // Exclude today's dayOfWeek from operationalDays
    const allDaysExceptToday = [0, 1, 2, 3, 4, 5, 6].filter(d => d !== now.dayOfWeek);

    const status = checkStoreOperationalStatus({
      openTime: '00:00',
      closeTime: '23:59',
      operationalDays: JSON.stringify(allDaysExceptToday),
      disabledDates: '[]'
    });

    expect(status.isOpen).toBe(false);
    expect(status.reason).toBe('DAY_OFF');
    expect(status.message).toContain('libur setiap hari');
  });

  it('should correctly flag a store as closed on a disabled/holiday date', () => {
    const now = getJakartaNow();

    const status = checkStoreOperationalStatus({
      openTime: '00:00',
      closeTime: '23:59',
      operationalDays: '[0,1,2,3,4,5,6]',
      disabledDates: JSON.stringify([now.dateStr])
    });

    expect(status.isOpen).toBe(false);
    expect(status.reason).toBe('HOLIDAY');
    expect(status.message).toContain('libur khusus');
  });

  it('should correctly report open when within operational hours 00:00-23:59', () => {
    const status = checkStoreOperationalStatus({
      openTime: '00:00',
      closeTime: '23:59',
      operationalDays: '[0,1,2,3,4,5,6]',
      disabledDates: '[]'
    });

    expect(status.isOpen).toBe(true);
    expect(status.reason).toBeNull();
    expect(status.openTime).toBe('00:00');
    expect(status.closeTime).toBe('23:59');
  });

  it('should apply customHours override for a weekday', () => {
    const now = getJakartaNow();
    const dayKey = String(now.dayOfWeek);

    const customHours = JSON.stringify({
      weekdays: {
        [dayKey]: { openTime: '10:00', closeTime: '14:00' }
      },
      dates: {}
    });

    const hours = getEffectiveStoreHours(
      {
        openTime: '08:00',
        closeTime: '21:00',
        customHours
      },
      now.dateStr,
      now.dayOfWeek
    );

    expect(hours.openTime).toBe('10:00');
    expect(hours.closeTime).toBe('14:00');
  });
});
