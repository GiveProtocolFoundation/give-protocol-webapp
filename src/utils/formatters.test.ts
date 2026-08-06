import {
  formatFiat,
  formatCrypto,
  formatCompact,
  parseFormattedNumber,
  formatPercentage,
  abbreviateAddress,
} from './formatters';

describe('formatFiat', () => {
  const usdCurrency = { code: 'USD', symbol: '$' };
  const eurCurrency = { code: 'EUR', symbol: '€' };

  it('should format basic fiat amounts', () => {
    expect(formatFiat(1234.56, usdCurrency)).toBe('$1,234.56');
    expect(formatFiat(1234.56, eurCurrency)).toBe('€1,234.56');
  });

  it('should respect custom decimal places', () => {
    expect(formatFiat(1234.567, usdCurrency, { decimals: 0 })).toContain('1,235');
    expect(formatFiat(1234.567, usdCurrency, { decimals: 3 })).toContain('1,234.567');
  });

  it('should hide symbol when showSymbol is false', () => {
    const result = formatFiat(1234.56, usdCurrency, { showSymbol: false });
    expect(result).not.toContain('$');
    expect(result).toContain('1,234.56');
  });

  it('should format compact notation for large numbers', () => {
    const result = formatFiat(1234567, usdCurrency, { compact: true });
    expect(result).toContain('M');
  });

  it('should not use compact notation for small numbers', () => {
    const result = formatFiat(999, usdCurrency, { compact: true });
    expect(result).not.toContain('K');
  });
});

describe('formatCrypto', () => {
  const ethToken = { symbol: 'ETH', decimals: 18 };

  it('should format crypto amounts with symbol', () => {
    expect(formatCrypto(1.23456789, ethToken)).toContain('ETH');
    expect(formatCrypto(1.23456789, ethToken)).toContain('1.23');
  });

  it('should use appropriate decimals for small amounts', () => {
    const verySmall = formatCrypto(0.00000123, ethToken);
    expect(verySmall).toContain('0.00000123');
  });

  it('should use appropriate decimals for medium amounts', () => {
    const medium = formatCrypto(0.123456, ethToken);
    expect(medium).toContain('0.123456');
  });

  it('should respect custom decimal option', () => {
    expect(formatCrypto(1.23456789, ethToken, { decimals: 2 })).toContain('1.23');
  });

  it('should hide symbol when showSymbol is false', () => {
    const result = formatCrypto(1.23, ethToken, { showSymbol: false });
    expect(result).not.toContain('ETH');
  });

  it('should format compact notation for large numbers', () => {
    const result = formatCrypto(1234567, ethToken, { compact: true });
    expect(result).toContain('M');
    expect(result).toContain('ETH');
  });
});

describe('formatCompact', () => {
  it('should format thousands', () => {
    expect(formatCompact(1234, '$')).toBe('$1.23K');
    expect(formatCompact(5000, '$')).toBe('$5K');
  });

  it('should format millions', () => {
    expect(formatCompact(1234567, '$')).toBe('$1.23M');
    expect(formatCompact(5000000, '$')).toBe('$5M');
  });

  it('should format billions', () => {
    expect(formatCompact(1234567890, '$')).toBe('$1.23B');
    expect(formatCompact(5000000000, '$')).toBe('$5B');
  });

  it('should handle negative numbers', () => {
    expect(formatCompact(-1234, '$')).toBe('-$1.23K');
  });

  it('should format without symbol', () => {
    expect(formatCompact(1234, '$', false)).toBe('1.23K');
  });

  it('should not use suffix for small numbers', () => {
    expect(formatCompact(999, '$')).toBe('$999');
  });

  it('should remove trailing zeros', () => {
    expect(formatCompact(1000, '$')).toBe('$1K');
    expect(formatCompact(1500, '$')).toBe('$1.5K');
  });
});

describe('parseFormattedNumber', () => {
  it('should parse US formatted numbers', () => {
    expect(parseFormattedNumber('$1,234.56')).toBe(1234.56);
    expect(parseFormattedNumber('1,234.56')).toBe(1234.56);
  });

  it('should parse European formatted numbers with comma as decimal', () => {
    // When only comma is present, it's treated as decimal separator
    expect(parseFormattedNumber('1234,56')).toBe(1234.56);
    expect(parseFormattedNumber('€1234,56')).toBe(1234.56);
  });

  it('should handle numbers with only commas', () => {
    expect(parseFormattedNumber('1,234')).toBe(1.234); // Treated as decimal separator
  });

  it('should handle numbers with both commas and dots', () => {
    expect(parseFormattedNumber('1,234.56')).toBe(1234.56);
  });

  it('should return 0 for invalid input', () => {
    expect(parseFormattedNumber('')).toBe(0);
    expect(parseFormattedNumber('abc')).toBe(0);
  });

  it('should handle negative numbers', () => {
    expect(parseFormattedNumber('-$1,234.56')).toBe(-1234.56);
  });
});

describe('formatPercentage', () => {
  it('should format basic percentages', () => {
    expect(formatPercentage(0.15)).toBe('15.00%');
    expect(formatPercentage(0.5)).toBe('50.00%');
    expect(formatPercentage(1)).toBe('100.00%');
  });

  it('should respect custom decimal places', () => {
    expect(formatPercentage(0.1567, 1)).toBe('15.7%');
    expect(formatPercentage(0.1567, 3)).toBe('15.670%');
  });

  it('should handle zero', () => {
    expect(formatPercentage(0)).toBe('0.00%');
  });

  it('should handle very small percentages', () => {
    expect(formatPercentage(0.0001, 4)).toBe('0.0100%');
  });
});

describe('abbreviateAddress', () => {
  const fullAddress = '0x1234567890abcdef1234567890abcdef12345678';

  it('should abbreviate standard address', () => {
    expect(abbreviateAddress(fullAddress)).toBe('0x1234...5678');
  });

  it('should use custom start and end characters', () => {
    expect(abbreviateAddress(fullAddress, 8, 6)).toBe('0x123456...345678');
  });

  it('should not abbreviate short addresses', () => {
    const shortAddress = '0x123456';
    expect(abbreviateAddress(shortAddress)).toBe(shortAddress);
  });

  it('should handle addresses at edge case length', () => {
    const edgeCase = '0x12345678';
    expect(abbreviateAddress(edgeCase, 6, 4)).toBe(edgeCase);
  });
});
