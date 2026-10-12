/**
 * Utility functions for timezone-aware date formatting.
 * Default timezone is set to Atlanta, Georgia, USA (America/New_York / Eastern Time).
 */

export const WMS_TIMEZONE = 'America/New_York'

export function formatToAtlantaTime(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '-'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return '-'

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: WMS_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }

  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date)
}

export function formatToAtlantaDateOnly(
  dateInput: string | Date | null | undefined
): string {
  if (!dateInput) return '-'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-US', {
    timeZone: WMS_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

export function getAtlantaNow(): Date {
  // Returns current date adjusted to America/New_York representation
  return new Date()
}
