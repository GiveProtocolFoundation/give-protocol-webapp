import { describe, it, expect } from "@jest/globals";
import { formatDonationsForExport, exportDonationsToCSV } from "./export";
import type { Transaction } from "@/types/contribution";

// date is auto-mocked via moduleNameMapper
// Mock URL.createObjectURL for jsdom (csvHelpers calls this)
global.URL.createObjectURL = () => "blob:mock-url";
global.URL.revokeObjectURL = () => undefined;

describe("export utils", () => {
  const mockTransactions: Transaction[] = [
    {
      id: "tx-1",
      timestamp: "2026-01-15T10:30:00Z",
      amount: 1.5,
      cryptoType: "ETH",
      purpose: "Education Fund",
      hash: "0xabc123",
      fiatValue: 3000,
      fee: 0.001,
      from: "0xsender1",
      to: "0xrecipient1",
      metadata: {
        description: "Monthly donation",
        verificationHash: "0xverify1",
        blockNumber: 12345,
      },
    },
    {
      id: "tx-2",
      timestamp: "2026-01-14T08:00:00Z",
      amount: 0,
      from: "0xsender2",
      to: "0xrecipient2",
    },
  ];

  describe("formatDonationsForExport", () => {
    it("should format transaction with all fields", () => {
      const result = formatDonationsForExport([mockTransactions[0]]);
      expect(result).toHaveLength(1);
      expect(result[0].cryptoType).toBe("ETH");
      expect(result[0].amount).toBe("1.5");
      expect(result[0].purpose).toBe("Education Fund");
      expect(result[0].transactionHash).toBe("0xabc123");
      expect(result[0].fiatValue).toBe("$3000.00");
      expect(result[0].transactionFee).toBe("0.001");
      expect(result[0].senderAddress).toBe("0xsender1");
      expect(result[0].recipientAddress).toBe("0xrecipient1");
      expect(result[0].details).toBe("Monthly donation");
      expect(result[0].verificationHash).toBe("0xverify1");
      expect(result[0].blockNumber).toBe("12345");
    });

    it("should handle transaction with missing optional fields", () => {
      const result = formatDonationsForExport([mockTransactions[1]]);
      expect(result[0].cryptoType).toBe("");
      expect(result[0].amount).toBe("0");
      expect(result[0].purpose).toBe("Donation");
      expect(result[0].transactionHash).toBe("");
      expect(result[0].fiatValue).toBe("");
      expect(result[0].transactionFee).toBe("");
      expect(result[0].senderAddress).toBe("0xsender2");
      expect(result[0].recipientAddress).toBe("0xrecipient2");
      expect(result[0].details).toBe("");
      expect(result[0].verificationHash).toBe("");
      expect(result[0].blockNumber).toBe("");
    });

    it("should handle empty array", () => {
      expect(formatDonationsForExport([])).toEqual([]);
    });
  });

  describe("exportDonationsToCSV", () => {
    it("should export without errors", () => {
      expect(() => exportDonationsToCSV(mockTransactions)).not.toThrow();
    });

    it("should accept custom filename", () => {
      expect(() =>
        exportDonationsToCSV(mockTransactions, "my-donations.csv"),
      ).not.toThrow();
    });

    it("should handle empty transactions array", () => {
      expect(() => exportDonationsToCSV([])).not.toThrow();
    });
  });
});
