// Mock for contribution/DonationLeaderboard
// Reports mockDonationRows.current through onRowsChange so page tests can
// control whether there is data to export.
import { useEffect } from "react";

export const mockDonationRows = { current: [] };

/**
 * Stub DonationLeaderboard that reports mockDonationRows.current to the page.
 * @param {object} props - Component props
 * @param {Function} [props.onRowsChange] - Callback receiving the visible rows
 * @param {string} [props.region] - Giver region the page selected
 * @returns {JSX.Element} Placeholder element
 */
export const DonationLeaderboard = ({ onRowsChange, region }) => {
  useEffect(() => {
    onRowsChange?.(mockDonationRows.current);
  }, [onRowsChange]);
  return (
    <div data-testid="donation-leaderboard" data-region={region}>
      Donation Leaderboard
    </div>
  );
};
