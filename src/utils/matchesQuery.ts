/**
 * Case-insensitive match of a query against any of the given fields.
 * @param query - User-entered search text
 * @param fields - Text fields of the item being tested
 * @returns True when the query is blank or appears in any field
 */
export function matchesQuery(
  query: string,
  fields: Array<string | undefined>,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  return fields.some((field) => field?.toLowerCase().includes(needle));
}
