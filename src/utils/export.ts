import { Transaction } from "@/types/contribution";
import { formatDate } from "./date";
import { convertToCSV, downloadCSV } from "./csvHelpers";

/** Row data shape for donation CSV exports. */
export interface DonationExportData {
  date: string;
  type: string;
  cryptoType: string;
  amount: string;
  purpose: string;
  transactionHash: string;
  fiatValue: string;
  transactionFee: string;
  senderAddress: string;
  recipientAddress: string;
  details: string;
  verificationHash: string;
  blockNumber: string;
}

/**
 * Formats donation data for CSV export
 * @param donations Array of donation transactions
 * @returns Formatted data ready for CSV export
 */
export function formatDonationsForExport(
  donations: Transaction[],
): DonationExportData[] {
  return donations.map((donation) => ({
    date: formatDate(donation.timestamp, true), // true for including time
    type: donation.purpose || "Donation",
    cryptoType: donation.cryptoType || "",
    amount: donation.amount ? donation.amount.toString() : "0",
    purpose: donation.purpose || "Donation",
    transactionHash: donation.hash || "",
    fiatValue: donation.fiatValue ? `$${donation.fiatValue.toFixed(2)}` : "",
    transactionFee: donation.fee ? donation.fee.toString() : "",
    senderAddress: donation.from || "",
    recipientAddress: donation.to || "",
    details:
      donation.metadata?.description ||
      donation.metadata?.opportunity ||
      donation.metadata?.category ||
      "",
    verificationHash: donation.metadata?.verificationHash || "",
    blockNumber: donation.metadata?.blockNumber
      ? donation.metadata.blockNumber.toString()
      : "",
  }));
}

/**
 * Exports donation data to CSV
 * @param donations Array of donation transactions
 * @param filename Optional filename (defaults to donations_YYYY-MM-DD.csv)
 */
export function exportDonationsToCSV(
  donations: Transaction[],
  filename?: string,
): void {
  const formattedData = formatDonationsForExport(donations);
  const csvData = convertToCSV(formattedData);
  const defaultFilename = `contributions_${new Date().toISOString().split("T")[0]}.csv`;

  downloadCSV(csvData, filename || defaultFilename);
}
