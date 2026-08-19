/**
 * Serialization-aware formatters. Two hazards live here:
 *
 *  - Date-only values (DOB) and appointment slots are ISO timestamps whose
 *    calendar day is the UTC date (`YYYY-MM-DD`). Format from those parts;
 *    do not localise or the day can shift.
 *  - Money arrives as a decimal string ("150.00"). Parse before arithmetic.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-08-08T00:00:00.000Z" -> "2026-08-08". Timezone-free. */
export function toDateKey(value: string | Date) {
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return value.slice(0, 10);
}

/** Today's calendar date in the user's own timezone, as "YYYY-MM-DD". */
export function todayKey() {
  return toDateKey(new Date());
}

export type BillingPeriod = "today" | "week" | "month" | "all";

/** Start date (inclusive) for a billing period, as YYYY-MM-DD. */
export function fromKeyForBillingPeriod(period: BillingPeriod) {
  if (period === "all") return undefined;
  const on = new Date();
  if (period === "week") on.setDate(on.getDate() - 6);
  if (period === "month") on.setDate(on.getDate() - 29);
  return toDateKey(on);
}

/** Formats a date-only value as "08 Aug 2026" without any timezone shift. */
export function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = toDateKey(value).split("-");
  const monthIndex = Number(month) - 1;
  if (!year || Number.isNaN(monthIndex)) return "—";
  return `${day} ${MONTHS[monthIndex] ?? month} ${year}`;
}

/**
 * Calendar age from a date-only DOB. Uses YYYY-MM-DD parts so UTC midnight
 * values never shift the birthday.
 */
export function ageFromDateOfBirth(
  value: string | null | undefined,
  on: string = todayKey(),
) {
  const parts = agePartsFromDateOfBirth(value, on);
  return parts ? parts.years : null;
}

/** Years and leftover months since a date-only DOB. */
export function agePartsFromDateOfBirth(
  value: string | null | undefined,
  on: string = todayKey(),
) {
  if (!value) return null;
  const [year, month, day] = toDateKey(value).split("-").map(Number);
  const [cy, cm, cd] = toDateKey(on).split("-").map(Number);
  if (![year, month, day, cy, cm, cd].every(Number.isFinite)) return null;

  let years = cy - year;
  let months = cm - month;
  let days = cd - day;
  if (days < 0) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return null;
  return { years, months };
}

/**
 * Approximate DOB from an age: today minus `years` years and `months` months.
 * Used when reception enters age instead of a known birth date.
 */
export function dateOfBirthFromAge(
  years: number,
  months: number = 0,
  on: string = todayKey(),
) {
  const [cy, cm, cd] = toDateKey(on).split("-").map(Number);
  const date = new Date(Date.UTC(cy, cm - 1, cd));
  date.setUTCFullYear(date.getUTCFullYear() - years);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

/** "Male · 34 yrs · 08 Aug 1991" style line for patient summaries. */
export function formatPatientDemographics(patient: {
  gender: "MALE" | "FEMALE";
  dateOfBirth: string;
}) {
  const sex = patient.gender === "MALE" ? "Male" : "Female";
  const age = ageFromDateOfBirth(patient.dateOfBirth);
  const dob = formatDateOnly(patient.dateOfBirth);
  if (age === null) return `${sex} · ${dob}`;
  return `${sex} · ${age} yrs · ${dob}`;
}

/**
 * Hospital-style age breakdown from a date-only DOB: "44 Y · 7 M · 3 W · 5 D".
 */
export function formatAgeDetail(
  value: string | null | undefined,
  on: string = todayKey(),
) {
  if (!value) return "—";
  const [year, month, day] = toDateKey(value).split("-").map(Number);
  const [cy, cm, cd] = toDateKey(on).split("-").map(Number);
  if (![year, month, day, cy, cm, cd].every(Number.isFinite)) return "—";

  let y = cy - year;
  let m = cm - month;
  let d = cd - day;
  if (d < 0) {
    m -= 1;
    const prevMonth = cm === 1 ? 12 : cm - 1;
    const prevYear = cm === 1 ? cy - 1 : cy;
    d += new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  if (y < 0) return "—";
  const weeks = Math.floor(d / 7);
  const days = d % 7;
  return `${y} Y · ${m} M · ${weeks} W · ${days} D`;
}

/** Formats a date-only value as "Sat 08 Aug", again without shifting. */
export function formatDateOnlyShort(value: string | null | undefined) {
  if (!value) return "—";
  const key = toDateKey(value);
  const [year, month, day] = key.split("-").map(Number);
  // Constructed as UTC so the weekday matches the stored calendar date.
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ${String(day).padStart(2, "0")} ${MONTHS[month - 1]}`;
}

/** A real timestamp — safe to localise, since it denotes an instant. */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDateOnly(toDateKey(date))} · ${date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function formatRelativeDays(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const days = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDateOnly(toDateKey(date));
}

/**
 * Appointment slot time for display.
 * Accepts stored ISO DateTimes (`…T14:30:00.000Z`) or legacy "HH:mm".
 * Uses UTC clock parts so date-only clinic slots never shift.
 */
export function formatTime(value: string | null | undefined) {
  const hhmm = toTimeInputValue(value);
  return hhmm || "—";
}

/** Combine a date picker (YYYY-MM-DD) and time picker (HH:mm) into a UTC slot ISO. */
export function toUtcDateTime(dateKey: string, timeHHmm: string) {
  if (!dateKey || !timeHHmm) return "";
  return `${dateKey}T${timeHHmm}:00.000Z`;
}

/** "HH:mm" for `<input type="time">` from an ISO slot or plain HH:mm. */
export function toTimeInputValue(value: string | null | undefined) {
  if (!value || !value.trim()) return "";
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  // ISO / DateTime string — read UTC hours so clinic wall times stay put.
  const match = trimmed.match(/T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

/** Matches server `@db.Decimal(10, 2)` — larger values overflow Postgres. */
export const MAX_MONEY = 99_999_999.99;

/** Parses a decimal money string. Returns 0 for null so totals stay numeric. */
export function parseMoney(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = typeof value === "number" ? value : parseMoney(value);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Sums decimal strings without ever multiplying or adding the raw values. */
export function sumMoney(values: (string | null | undefined)[]) {
  return values.reduce((total, value) => total + parseMoney(value), 0);
}

export function formatEnum(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Adds days to a "YYYY-MM-DD" key using UTC arithmetic, so no DST drift. */
export function addDaysToKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfMonthKey(key: string) {
  return `${key.slice(0, 7)}-01`;
}

export function endOfMonthKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** Monday-first index for a calendar grid. */
export function weekdayIndex(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (jsDay + 6) % 7;
}

export function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
