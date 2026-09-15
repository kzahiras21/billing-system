export const TAX_RATE_BPS = 1100; // 11%
export const INVOICE_DAY = 1;
export const DUE_DAY = 15;
export const TRIAL_DAYS = 3;
export const MIN_CONTRACT_MONTHS = 12;

export function calculateTax(amount: number, taxRateBps = TAX_RATE_BPS) {
  return Math.round((amount * taxRateBps) / 10_000);
}

export function daysInMonth(year: number, monthZeroBased: number) {
  return new Date(year, monthZeroBased + 1, 0).getDate();
}

export function calculateProratedAmount(monthlyPrice: number, activeFrom: Date) {
  const year = activeFrom.getFullYear();
  const month = activeFrom.getMonth();
  const totalDays = daysInMonth(year, month);
  const billableDays = totalDays - activeFrom.getDate() + 1;
  return Math.round((monthlyPrice * billableDays) / totalDays);
}

export function dueDateFor(year: number, monthZeroBased: number) {
  return new Date(year, monthZeroBased, DUE_DAY, 23, 59, 59, 999);
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
