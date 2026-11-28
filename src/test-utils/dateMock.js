import { jest } from "@jest/globals";

export const formatDate = jest.fn((date, includeTime) =>
  includeTime ? `${date} 10:00 AM` : String(date),
);

export const formatDateShort = jest.fn((date) => String(date));

export const parseDate = jest.fn((date) => new Date(date));

export const getPeriodStartDate = jest.fn((period) =>
  period === "all" ? undefined : "2026-01-01",
);
