import { Logger } from "@/utils/logger";

/**
 * Formats a blockchain balance for display, converting from wei/smallest unit to readable format
 * @param balance - The balance as string, number, or BigInt (in smallest denomination)
 * @returns Formatted balance string with proper decimal places
 */
export const formatBalance = (balance: string | number | bigint): string => {
  try {
    // Handle empty or invalid input
    if (!balance) return '0.00';
    
    // Convert to string first to handle all input types
    const balanceStr = balance.toString().replaceAll(/[^\d]/g, '');
    
    // Handle empty string after sanitization
    if (!balanceStr) return '0.00';
    
    // Convert to BigInt safely
    const value = BigInt(balanceStr);
    const divisor = BigInt(10) ** BigInt(12); // 1e12 for DOT conversion
    const whole = value / divisor;
    const fraction = value % divisor;
    
    return `${whole}.${fraction.toString().padStart(12, '0')}`;
  } catch (error) {
    Logger.error('Error formatting balance:', { error });
    return '0.00';
  }
};

/**
 * Shortens a blockchain address for display purposes
 * @param address - The full blockchain address to shorten
 * @returns Shortened address in format '0x1234...abcd' or empty string if invalid
 */
export const shortenAddress = (address: string): string => {
  if (!address || address.length < 10) return address || '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Validates if an address follows Ethereum address format
 * @param address - The address string to validate
 * @returns true if address matches Ethereum (0x...) format
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};