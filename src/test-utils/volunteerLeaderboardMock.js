// Mock for contribution/VolunteerLeaderboard
// Reports mockVolunteerRows.current through onRowsChange so page tests can
// control whether there is data to export.
import { useEffect } from "react";

export const mockVolunteerRows = { current: [] };

/**
 * Stub VolunteerLeaderboard that reports mockVolunteerRows.current to the page.
 * @param {object} props - Component props
 * @param {Function} [props.onRowsChange] - Callback receiving the visible rows
 * @param {string} [props.region] - Giver region the page selected
 * @returns {JSX.Element} Placeholder element
 */
export const VolunteerLeaderboard = ({ onRowsChange, region }) => {
  useEffect(() => {
    onRowsChange?.(mockVolunteerRows.current);
  }, [onRowsChange]);
  return (
    <div data-testid="volunteer-leaderboard" data-region={region}>
      Volunteer Leaderboard
    </div>
  );
};
