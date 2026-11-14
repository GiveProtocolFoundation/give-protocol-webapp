// Mock for contribution/VolunteerLeaderboard
// Reports mockVolunteerRows.current through onRowsChange so page tests can
// control whether there is data to export.
import { useEffect } from "react";

export const mockVolunteerRows = { current: [] };

export const VolunteerLeaderboard = ({ onRowsChange }) => {
  useEffect(() => {
    onRowsChange?.(mockVolunteerRows.current);
  }, [onRowsChange]);
  return <div data-testid="volunteer-leaderboard">Volunteer Leaderboard</div>;
};
