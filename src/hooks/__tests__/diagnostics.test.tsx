import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.mock("../useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock("../../components/CurrencyDisplay", () => ({
  CurrencyDisplay: ({ amount }: { amount: number }) => (
    <span data-testid="currency-display">${amount}</span>
  ),
}));

import { DonorStats } from "../../components/donor/DonorStats";

describe("mock test", () => {
  it("should use mock", () => {
    render(
      <DonorStats
        totalDonated={100}
        impactGrowth={50}
        charitiesSupported={3}
      />,
    );
    expect(screen.getAllByTestId("currency-display").length).toBeGreaterThan(0);
  });
});
