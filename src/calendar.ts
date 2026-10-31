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
