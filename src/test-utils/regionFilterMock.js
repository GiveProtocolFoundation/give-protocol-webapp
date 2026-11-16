// Mock for contribution/RegionFilter component
/**
 * Stub for the giver region select.
 * @param {{ value: string, onChange: (value: string) => void }} props - Selected value and change callback
 * @returns {JSX.Element} A select with a few region options
 */
export const RegionFilter = ({ value, onChange }) => (
  <select
    data-testid="region-filter"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    <option value="all">All giver regions</option>
    <option value="ssa">Sub-Saharan Africa</option>
    <option value="unspecified">Region not specified</option>
  </select>
);
