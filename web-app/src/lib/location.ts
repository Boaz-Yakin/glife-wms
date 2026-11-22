/**
 * Warehouse Location Code Display Utility
 * Converts standard internal format (e.g., "1-L-04-FLOOR", "1-L-01-A")
 * into compact, high-visibility user-friendly format (e.g., "1L-04F", "1L-01A").
 * - Aisle 1, Side L, Bay 04, Level FLOOR -> "1L-04F"
 * - "FLOOR" or "FL" is always formatted as "F".
 */

export function formatDisplayLocation(code?: string | null): string {
  if (!code) return '';
  return code.replace(
    /^(\d)[\s-_]*([LR])[\s-_]*(\d{1,2})[\s-_]*(FLOOR|FL|[ABC])$/i,
    (_, aisle, side, rack, level) => {
      const rackStr = ('0' + rack).slice(-2);
      const upperLevel = level.toUpperCase();
      const lv = upperLevel === 'FLOOR' || upperLevel === 'FL' ? 'F' : upperLevel;
      return `${aisle}${side.toUpperCase()}-${rackStr}${lv}`;
    }
  );
}

/**
 * Reverse converter: converts user input "1L-04F" into DB format "1-L-04-FLOOR"
 * Useful for search query normalization.
 */
export function parseToDatabaseLocation(displayCode?: string | null): string {
  if (!displayCode) return '';
  return displayCode.replace(
    /^(\d)([LR])-(\d{2})([FABC])$/i,
    (_, aisle, side, rack, level) => {
      const upperLevel = level.toUpperCase();
      const lv = upperLevel === 'F' ? 'FLOOR' : upperLevel;
      return `${aisle}-${side.toUpperCase()}-${rack}-${lv}`;
    }
  );
}
