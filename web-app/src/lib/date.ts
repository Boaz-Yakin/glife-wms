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

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** `YYYY-MM-DD` 형식이면서 실제 존재하는 날짜인지 검사 */
export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_REGEX.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** 시각(TIMESTAMPTZ 등)을 America/New_York 기준 `YYYY-MM-DD`로 변환. 잘못된 값이면 null */
export function toAtlantaDateString(
  dateInput: string | Date | null | undefined
): string | null {
  if (!dateInput) return null
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return null
  // en-CA 로케일은 YYYY-MM-DD 형식으로 출력
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WMS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * 인보이스 날짜 검증 (TRD 6.3). 문제가 없으면 null, 있으면 에러 메시지 반환.
 * invoice_date >= order_date(America/New_York 기준 날짜) 이어야 한다.
 */
export function validateInvoiceDate(
  invoiceDate: string | null | undefined,
  orderDate: string | Date | null | undefined
): string | null {
  if (!invoiceDate) return null
  if (!isValidDateOnly(invoiceDate)) {
    return 'Invoice date must be a valid date (YYYY-MM-DD).'
  }
  const orderDay = toAtlantaDateString(orderDate)
  if (orderDay && invoiceDate < orderDay) {
    return `Invoice date (${invoiceDate}) cannot be earlier than the order date (${orderDay}). Please adjust the invoice date as well.`
  }
  return null
}
