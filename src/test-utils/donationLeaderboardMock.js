// Mock for contribution/DonationLeaderboard
// Reports mockDonationRows.current through onRowsChange so page tests can
// control whether there is data to export.
import { useEffect } from "react";

export const mockDonationRows = { current: [] };

export const DonationLeaderboard = ({ onRowsChange }) => {
  useEffect(() => {
    onRowsChange?.(mockDonationRows.current);
  }, [onRowsChange]);
  return <div data-testid="donation-leaderboard">Donation Leaderboard</div>;
};
