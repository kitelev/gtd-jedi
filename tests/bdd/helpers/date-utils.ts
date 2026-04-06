/**
 * Date utilities for BDD tests.
 * Timezone-aware helpers for scheduling logic.
 */

/**
 * Returns the date of the next Saturday from the given date.
 * If `from` is already Saturday, returns the NEXT Saturday (7 days later).
 *
 * @param from - The reference date
 * @returns Date object set to the next Saturday (time set to 00:00:00)
 */
export function nextSaturday(from: Date): Date {
  const result = new Date(from);
  result.setHours(0, 0, 0, 0);
  const dayOfWeek = result.getDay(); // 0=Sun, 6=Sat
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntilSaturday);
  return result;
}

/**
 * Format a Date as YYYY-MM-DD string.
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
