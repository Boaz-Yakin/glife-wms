/**
 * Warehouse Location Code Display Utility
 * Converts standard internal format (e.g., "1-L-01-A", "1-L-01-FLOOR")
 * into compact, high-visibility user-friendly format (e.g., "1L-01A", "1L-01F").
 */

export function formatDisplayLocation(code?: string | null): string {
  if (!code) return '';
  return code.replace(
    /^(\d)-([LR])-(\d{1,2})-(FLOOR|FL|[ABC])$/i,
    (_, aisle, side, rack, level) => {
      const rackStr = ('0' + rack).slice(-2);
      const upperLevel = level.toUpperCase();
      const lv = upperLevel === 'FLOOR' || upperLevel === 'FL' ? 'F' : upperLevel;
      return `${aisle}${side.toUpperCase()}-${rackStr}${lv}`;
    }
  );
}
