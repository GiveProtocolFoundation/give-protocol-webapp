/** A single impact metric definition for a portfolio fund. */
export interface FundImpactMetric {
  id: string;
  fundId: string;
  unitName: string;
  unitCostUsd: number;
  unitIcon: string;
  descriptionTemplate: string;
  sortOrder: number;
  updatedAt: string;
}

/** The computed impact result for a given fund and donation amount. */
export interface ImpactResult {
  metricId: string;
  unitName: string;
  unitIcon: string;
  value: number;
  formattedValue: string;
  description: string;
}
