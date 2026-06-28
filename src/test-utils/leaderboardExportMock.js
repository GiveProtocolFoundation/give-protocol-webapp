// Mock for @/utils/leaderboardExport
import { jest } from "@jest/globals";

export const exportLeaderboardToPDF = jest.fn(() => Promise.resolve());
export const exportDonationLeaderboardToCSV = jest.fn();
export const exportVolunteerLeaderboardToCSV = jest.fn();
