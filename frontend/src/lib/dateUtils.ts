/**
 * Consistent date formatting utility for TexFlow.
 *
 * Using an explicit locale ("en-IN") and timeZone ("Asia/Kolkata") ensures
 * that the server-rendered HTML matches the client-side hydration output,
 * preventing React hydration mismatch warnings caused by different locales
 * on the Next.js server vs. the user's browser.
 */

const DEFAULT_LOCALE = "en-IN";
const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Format a date string/Date to a short date like "10/10/2026".
 * Safe for use in both server components and client components.
 */
export function formatDate(
  value: string | Date | number | null | undefined,
): string {
  if (!value) return "—";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(DEFAULT_LOCALE, {
      timeZone: DEFAULT_TIMEZONE,
    });
  } catch {
    return "—";
  }
}

/**
 * Format a date string/Date to date + time like "10/10/2026, 10:30".
 */
export function formatDateTime(
  value: string | Date | number | null | undefined,
): string {
  if (!value) return "—";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString(DEFAULT_LOCALE, {
      timeZone: DEFAULT_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Format a date to time-only like "10:30".
 */
export function formatTime(
  value: string | Date | number | null | undefined,
): string {
  if (!value) return "—";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString(DEFAULT_LOCALE, {
      timeZone: DEFAULT_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
