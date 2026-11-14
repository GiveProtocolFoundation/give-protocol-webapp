// Mock for contribution/VolunteerLeaderboard
// Reports mockVolunteerRows.current through onRowsChange so page tests can
// control whether there is data to export.
import { useEffect } from "react";

export const mockVolunteerRows = { current: [] };

/**
 * Stub VolunteerLeaderboard that reports mockVolunteerRows.current to the page.
 * @param {object} props - Component props
 * @param {Function} [props.onRowsChange] - Callback receiving the visible rows
 * @returns {JSX.Element} Placeholder element
 */
export const VolunteerLeaderboard = ({ onRowsChange }) => {
  useEffect(() => {
    onRowsChange?.(mockVolunteerRows.current);
  }, [onRowsChange]);
  return <div data-testid="volunteer-leaderboard">Volunteer Leaderboard</div>;
};
