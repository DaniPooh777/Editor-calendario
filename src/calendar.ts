/** Pure calendar date logic. No DOM, no state. */

export interface DayCell {
  /** Local date for this cell. */
  date: Date;
  /** Day of month number. */
  day: number;
  /** True when the cell belongs to the displayed month. */
  inMonth: boolean;
  /** Stable key YYYY-MM-DD (local time, no timezone shifts). */
  iso: string;
}

export const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
] as const;

export const WEEKDAYS_ES = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
] as const;

/** Format a Date as local YYYY-MM-DD (never via toISOString). */
export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Stable key for a month, e.g. "2026-11". Used to scope notes per month. */
export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

/** Local Date from a YYYY-MM-DD key (never via UTC parsing). */
function parseISO(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Shift an ISO key by whole days. */
export function addDaysISO(iso: string, days: number): string {
  const date = parseISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetweenISO(from: string, to: string): number {
  // Midnight to midnight; Math.round absorbs DST days of 23/25 hours.
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000);
}

/** Monday-based weekday of an ISO key: 0 = Monday … 6 = Sunday. */
export function isoWeekday(iso: string): number {
  return (parseISO(iso).getDay() + 6) % 7;
}

/**
 * Map a legacy free-text time ("9:00", "9.00 am", "21:30") to the "HH:MM"
 * value that <input type="time"> accepts. Returns '' when it cannot be mapped.
 */
export function toTimeInputValue(raw: string | undefined): string {
  if (!raw) return '';
  const match = raw.trim().match(/^(\d{1,2})(?:[:.,](\d{1,2}))?\s*([ap])?\.?\s*m?\.?$/i);
  if (!match) return '';
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  const meridiem = match[3]?.toLowerCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) return '';
    hours = hours % 12;
    if (meridiem === 'p') hours += 12;
  }
  if (hours > 23 || minutes > 59) return '';
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Minimal event shape needed to expand multi-day and recurring events. */
export interface EventSpan {
  date: string;
  endDate?: string;
  recurrence?: 'semanal' | 'mensual';
  /** Weekdays a weekly series lands on, 0 = Monday … 6 = Sunday. */
  recurrenceDays?: number[];
  /** Weeks between weekly occurrences; 1 or missing = every week. */
  recurrenceInterval?: number;
}

/** Monday of the week that contains `iso` (0 = Monday weeks). */
function mondayOf(iso: string): string {
  return addDaysISO(iso, -isoWeekday(iso));
}

/** Does `iso` start a weekly occurrence (weekday pick + week interval)? */
function isWeeklyOccurrence(span: EventSpan, iso: string): boolean {
  const days = span.recurrenceDays;
  // Picked weekdays win; an empty selection keeps "same weekday as `date`".
  const weekdayMatches = days && days.length
    ? days.includes(isoWeekday(iso))
    : isoWeekday(iso) === isoWeekday(span.date);
  if (!weekdayMatches) return false;
  const interval = Math.max(1, Math.floor(span.recurrenceInterval ?? 1));
  if (interval === 1) return true;
  // Every N weeks: count Monday-based weeks from the series' first week.
  const weeks = daysBetweenISO(mondayOf(span.date), mondayOf(iso)) / 7;
  return weeks >= 0 && weeks % interval === 0;
}

/** Does `iso` start an occurrence of the event (respecting recurrence)? */
function isOccurrenceStart(span: EventSpan, iso: string): boolean {
  if (!span.recurrence) return iso === span.date;
  if (span.recurrence === 'semanal') return isWeeklyOccurrence(span, iso);
  return iso.slice(8) === span.date.slice(8); // same day of the month
}

/**
 * Start day of the occurrence that covers `iso`, or null when the event does
 * not reach that day. Repeated series look back at most one period (a week or
 * a month): that finds the covering run and keeps rendering bounded.
 */
export function occurrenceStartFor(span: EventSpan, iso: string): string | null {
  const duration = span.endDate && span.endDate > span.date ? daysBetweenISO(span.date, span.endDate) : 0;
  if (!span.recurrence) {
    return iso >= span.date && iso <= addDaysISO(span.date, duration) ? span.date : null;
  }
  const lookback = span.recurrence === 'semanal' ? 7 : 31;
  for (let back = 0; back <= Math.min(duration, lookback); back++) {
    const start = addDaysISO(iso, -back);
    if (start < span.date) return null;
    if (isOccurrenceStart(span, start)) return start;
  }
  return null;
}

/**
 * Build the Monday-first grid for a month.
 * Returns 5 or 6 weeks of 7 DayCells, including leading/trailing
 * days from neighbouring months.
 */
export function getMonthGrid(year: number, monthIndex: number): DayCell[][] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  // getDay(): 0=Sun..6=Sat → offset with Monday as first column.
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const weeks: DayCell[][] = [];
  const cursor = new Date(year, monthIndex, 1 - startOffset);

  for (let i = 0; i < totalCells; i++) {
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({
      date: new Date(cursor),
      day: cursor.getDate(),
      inMonth: cursor.getMonth() === monthIndex,
      iso: toISO(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return weeks;
}
