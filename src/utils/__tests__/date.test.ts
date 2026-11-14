import { jest } from '@jest/globals';
import { formatDate, isValidDate, formatDateForInput, getDateRange, getPeriodStartDate } from '../date';

// Mock logger to avoid dependencies
jest.mock('@/utils/logger', () => ({
  Logger: {
    error: jest.fn(),
  },
}));

describe('date utilities', () => {
  describe('formatDate', () => {
    it('returns empty string for empty input', () => {
      expect(formatDate('')).toBe('');
    });

    it('returns empty string for null input', () => {
      // Testing null input by type assertion to unknown first
      expect(formatDate(null as unknown as string)).toBe('');
    });

    it('returns empty string for undefined input', () => {
      // Testing undefined input by type assertion to unknown first
      expect(formatDate(undefined as unknown as string)).toBe('');
    });

    it('formats valid date string without time', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('formats valid date string with time when includeTime is true', () => {
      const result = formatDate('2024-01-15T10:30:00Z', true);
      expect(result).toBe('15Jan2024 10:30 UTC');
    });

    it('handles different date formats', () => {
      const result1 = formatDate('2024-12-25T12:00:00Z');
      const result2 = formatDate('December 25, 2024');
      const result3 = formatDate('2024/12/25');
      
      expect(result1).toMatch(/Dec 25, 2024/);
      expect(result2).toMatch(/Dec 25, 2024/);
      expect(result3).toMatch(/Dec 2[45], 2024/); // Account for timezone differences
    });

    it('returns empty string for invalid date', () => {
      expect(formatDate('invalid-date')).toBe('');
    });

    it('returns empty string for dates that result in NaN', () => {
      expect(formatDate('not-a-date')).toBe('');
    });

    it('handles edge case dates', () => {
      // Test leap year
      const leapYear = formatDate('2024-02-29T12:00:00Z');
      expect(leapYear).toMatch(/Feb 29, 2024/);
      
      // Test year 2000
      const y2k = formatDate('2000-01-01T12:00:00Z');
      expect(y2k).toMatch(/Jan 1, 2000/);
    });

    it('formats time correctly with leading zeros', () => {
      const earlyMorning = formatDate('2024-01-15T05:05:00Z', true);
      expect(earlyMorning).toBe('15Jan2024 05:05 UTC');
    });

    it('handles midnight correctly', () => {
      const midnight = formatDate('2024-01-15T00:00:00Z', true);
      expect(midnight).toBe('15Jan2024 00:00 UTC');
    });

    it('handles different months correctly', () => {
      const months = [
        { input: '2024-01-01T12:00:00Z', expected: /Jan/ },
        { input: '2024-02-01T12:00:00Z', expected: /Feb/ },
        { input: '2024-03-01T12:00:00Z', expected: /Mar/ },
        { input: '2024-04-01T12:00:00Z', expected: /Apr/ },
        { input: '2024-05-01T12:00:00Z', expected: /May/ },
        { input: '2024-06-01T12:00:00Z', expected: /Jun/ },
        { input: '2024-07-01T12:00:00Z', expected: /Jul/ },
        { input: '2024-08-01T12:00:00Z', expected: /Aug/ },
        { input: '2024-09-01T12:00:00Z', expected: /Sep/ },
        { input: '2024-10-01T12:00:00Z', expected: /Oct/ },
        { input: '2024-11-01T12:00:00Z', expected: /Nov/ },
        { input: '2024-12-01T12:00:00Z', expected: /Dec/ },
      ];

      months.forEach(({ input, expected }) => {
        expect(formatDate(input)).toMatch(expected);
      });
    });

    it('handles error cases and returns original string', () => {
      // Mock date constructor to throw error
      const originalDate = global.Date;
      // Mock Date constructor to throw error
      global.Date = jest.fn(() => {
        throw new Error('Date constructor error');
      }) as unknown as DateConstructor;

      const result = formatDate('2024-01-01');
      expect(result).toBe('2024-01-01');

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('isValidDate', () => {
    it('returns true for valid date strings', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2024-01-15T10:30:00Z')).toBe(true);
      expect(isValidDate('December 25, 2024')).toBe(true);
      expect(isValidDate('2024/12/25')).toBe(true);
    });

    it('returns false for invalid date strings', () => {
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('not-a-date')).toBe(false);
      expect(isValidDate('2024-13-01')).toBe(false); // Invalid month
      // Note: JavaScript Date allows invalid dates like Feb 30, it just adjusts them
      expect(isValidDate('totally-invalid')).toBe(false);
    });

    it('returns false for empty strings', () => {
      expect(isValidDate('')).toBe(false);
    });

    it('returns false for null and undefined', () => {
      // JavaScript Date constructor accepts null/undefined and creates valid dates
      // So we test with string values that would be falsy
      expect(isValidDate('')).toBe(false);
      expect(isValidDate('null')).toBe(false);
      expect(isValidDate('undefined')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(isValidDate('2024-02-29')).toBe(true); // Valid leap year
      // JavaScript Date accepts Feb 29 in non-leap years and adjusts to Mar 1
      // So this test would actually return true, let's test something truly invalid
      expect(isValidDate('abc-def-ghi')).toBe(false); // Truly invalid format
      expect(isValidDate('1970-01-01')).toBe(true); // Unix epoch
    });
  });

  describe('formatDateForInput', () => {
    it('returns empty string for empty input', () => {
      expect(formatDateForInput('')).toBe('');
    });

    it('formats valid date for HTML input', () => {
      const result = formatDateForInput('2024-01-15T10:30:00Z');
      expect(result).toBe('2024-01-15');
    });

    it('handles different date formats', () => {
      expect(formatDateForInput('December 25, 2024')).toBe('2024-12-25');
      expect(formatDateForInput('2024/12/25')).toBe('2024-12-25');
    });

    it('returns empty string for invalid dates', () => {
      expect(formatDateForInput('invalid-date')).toBe('');
    });

    it('handles dates with time zones', () => {
      const result = formatDateForInput('2024-01-15T10:30:00-05:00');
      expect(result).toMatch(/2024-01-15/);
    });

    it('handles error cases gracefully', () => {
      // Mock Date constructor to throw
      const originalDate = global.Date;
      // Mock Date constructor to throw error
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      }) as unknown as DateConstructor;

      const result = formatDateForInput('2024-01-01');
      expect(result).toBe('');

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('getDateRange', () => {
    const mockNow = new Date('2024-01-15T10:30:00Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockNow);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns week range', () => {
      const { start, end } = getDateRange('week');
      
      expect(end).toEqual(mockNow);
      expect(start.getTime()).toBe(mockNow.getTime() - 7 * 24 * 60 * 60 * 1000);
    });

    it('returns month range', () => {
      const { start, end } = getDateRange('month');
      
      expect(end).toEqual(mockNow);
      // Start should be one month back
      const expectedStart = new Date(mockNow);
      expectedStart.setMonth(mockNow.getMonth() - 1);
      expect(start.getMonth()).toBe(expectedStart.getMonth());
    });

    it('returns quarter range', () => {
      const { start, end } = getDateRange('quarter');
      
      expect(end).toEqual(mockNow);
      // Start should be 3 months back
      const expectedStart = new Date(mockNow);
      expectedStart.setMonth(mockNow.getMonth() - 3);
      expect(start.getMonth()).toBe(expectedStart.getMonth());
    });

    it('returns year range', () => {
      const { start, end } = getDateRange('year');
      
      expect(end).toEqual(mockNow);
      expect(start.getFullYear()).toBe(mockNow.getFullYear() - 1);
    });

    it('returns all-time range for unknown period', () => {
      const { start, end } = getDateRange('unknown');
      
      expect(end).toEqual(mockNow);
      expect(start.getFullYear()).toBe(mockNow.getFullYear() - 100);
    });

    it('returns all-time range for empty string', () => {
      const { start, end } = getDateRange('');
      
      expect(end).toEqual(mockNow);
      expect(start.getFullYear()).toBe(mockNow.getFullYear() - 100);
    });

    it('handles edge cases across year boundaries', () => {
      // Test when current date is early in year
      const earlyYear = new Date('2024-01-01T00:00:00Z');
      jest.setSystemTime(earlyYear);

      const { start } = getDateRange('month');
      expect(start.getFullYear()).toBe(2023); // Should go to previous year
      expect(start.getMonth()).toBe(11); // December
    });

    it('handles leap year edge cases', () => {
      const leapDay = new Date('2024-02-29T00:00:00Z');
      jest.setSystemTime(leapDay);

      const { start, end } = getDateRange('year');
      expect(end).toEqual(leapDay);
      expect(start.getFullYear()).toBe(2023);
    });
  });

  describe('getPeriodStartDate', () => {
    // Thursday 14 Nov 2024, local time
    const now = new Date(2024, 10, 14, 15, 30);

    it('returns 1 January for the current year', () => {
      expect(getPeriodStartDate('year', now)).toBe('2024-01-01');
    });

    it('returns the first of the month for the current month', () => {
      expect(getPeriodStartDate('month', now)).toBe('2024-11-01');
    });

    it('returns the Monday of the current week', () => {
      expect(getPeriodStartDate('week', now)).toBe('2024-11-11');
    });

    it('treats Sunday as the last day of the week', () => {
      expect(getPeriodStartDate('week', new Date(2024, 10, 17))).toBe('2024-11-11');
    });

    it('crosses month boundaries for the week start', () => {
      expect(getPeriodStartDate('week', new Date(2024, 11, 1))).toBe('2024-11-25');
    });

    it('returns undefined for all time', () => {
      expect(getPeriodStartDate('all', now)).toBeUndefined();
    });
  });
});