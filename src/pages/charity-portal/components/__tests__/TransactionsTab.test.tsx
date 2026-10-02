import { jest, describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TransactionsTab } from "../TransactionsTab";
import type { Transaction } from "@/types/contribution";

jest.mock("@/components/CurrencyDisplay", () => ({
  CurrencyDisplay: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));

const SORT = { key: null, direction: "asc" } as const;

const TRANSACTION: Transaction = {
  id: "tx-1",
  amount: 25,
  cryptoType: "USD",
  fiatValue: 25,
  timestamp: "2026-01-15T12:00:00Z",
  status: "completed",
  purpose: "Fiat Donation",
  metadata: { organization: "Jane Donor", category: "Fiat Donation" },
};

const renderTab = (transactions: Transaction[]) =>
  render(
    <MemoryRouter>
      <TransactionsTab
        transactions={transactions}
        sortConfig={SORT}
        onSort={jest.fn()}
        onShowExportModal={jest.fn()}
      />
    </MemoryRouter>,
  );

describe("TransactionsTab", () => {
  it("hides the export button when there are no transactions", () => {
    renderTab([]);
    expect(
      screen.getByText("Ready to receive your first gift"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /export/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the export button once there are transactions", () => {
    renderTab([TRANSACTION]);
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });
});
