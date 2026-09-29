import { formatDistance } from "date-fns";
import { id } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

/**
 * WIB timezone = UTC+7 (Asia/Jakarta)
 */
const TIMEZONE = "Asia/Jakarta";

/**
 * Format tanggal dengan timezone WIB.
 */
export function formatWIB(date: Date | string | number | null | undefined, fmt: string): string {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return formatInTimeZone(d, TIMEZONE, fmt, { locale: id });
}

/**
 * Format tanggal ke format Indonesia dengan waktu WIB.
 * Contoh: "12 Juni 2026 • 14:30 WIB"
 */
export function formatDateTimeWIB(date: Date | string | null | undefined): string {
  return `${formatWIB(date, "dd MMMM yyyy • HH:mm")} WIB`;
}

/**
 * Format tanggal ke format Indonesia (tanpa waktu).
 * Contoh: "12 Juni 2026"
 */
export function formatDateWIB(date: Date | string | null | undefined): string {
  return formatWIB(date, "dd MMMM yyyy");
}

/**
 * Relative time (e.g., "2 jam yang lalu") in Indonesian
 */
export function formatRelativeWIB(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${formatDistance(d, new Date(), { locale: id })} yang lalu`;
}
