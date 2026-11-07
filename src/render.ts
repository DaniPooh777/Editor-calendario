/** DOM rendering. Reads state, writes DOM. Never mutates state. */

import { getMonthGrid, monthKey, MONTHS_ES, occurrenceStartFor, WEEKDAYS_ES } from './calendar';
import { renderDecorations } from './decorations';
import { BRUSH_COLORS, type AppState, type CalendarEvent } from './state';

/** Escape user text before inserting as HTML. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

/** Plain text of an HTML title (for tooltips/attributes). */
export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

export function renderTitle(state: AppState): void {
  el('month-name').textContent = MONTHS_ES[state.monthIndex];
  el('year-num').textContent = String(state.year);
}

export function renderWeekdays(): void {
  el('weekdays').innerHTML = WEEKDAYS_ES.map((d) => `<div class="weekday">${d}</div>`).join('');
}

export function renderBrush(state: AppState): void {
  const container = el('brush-colors');
  const buttons = BRUSH_COLORS.map(
    (color) =>
      `<button type="button" class="brush-swatch${state.brushColor === color ? ' active' : ''}" data-color="${color}" style="background:${color}" title="Pincel ${color}"></button>`,
  ).join('');
  container.innerHTML = buttons;

  const none = document.querySelector<HTMLButtonElement>('.brush-none');
  if (none) none.classList.toggle('active', state.brushColor === '');
}

function eventChip(ev: CalendarEvent): string {
  const time = ev.time ? `<small>${esc(ev.time)}</small>` : '';
  const style = ev.noBg ? 'style="background:transparent"' : `style="background:${esc(ev.color)}"`;
  return `<button type="button" class="event-chip${ev.noBg ? ' event-no-bg' : ''}" data-event-id="${esc(ev.id)}" draggable="true" ${style} title="Editar: ${esc(stripTags(ev.title))}">${ev.title}${time}</button>`;
}

/** Whole-cell (all-day) event: transparent label over the painted cell. */
function fillLabel(ev: CalendarEvent): string {
  const time = ev.time ? `<small>${esc(ev.time)}</small>` : '';
  return `<button type="button" class="fill-label" data-event-id="${esc(ev.id)}" draggable="true" title="Editar: ${esc(stripTags(ev.title))}">${ev.title}${time}</button>`;
}

/** Later day of a multi-day event: a slim bar, still clickable to edit. */
function continuationBar(ev: CalendarEvent): string {
  const style = ev.noBg ? 'style="background:transparent"' : `style="background:${esc(ev.color)}"`;
  return `<span class="event-continuation${ev.noBg ? ' event-no-bg' : ''}" data-event-id="${esc(ev.id)}" draggable="true" ${style} title="Continúa: ${esc(stripTags(ev.title))}"></span>`;
}

/** An event covering the cell, and whether this day starts its run. */
interface DayEntry {
  ev: CalendarEvent;
  kind: 'start' | 'middle';
  /** True when the event spans several days (endDate after the start). */
  multiDay: boolean;
}

function renderEntry(entry: DayEntry): string {
  if (entry.kind === 'middle') return continuationBar(entry.ev);
  return entry.ev.fill ? fillLabel(entry.ev) : eventChip(entry.ev);
}

export function renderGrid(state: AppState): void {
  const grid = el('grid');
  const weeks = getMonthGrid(state.year, state.monthIndex);

  grid.innerHTML = weeks
    .map((week) =>
      week
        .map((cell) => {
          // Every event covering this day: multi-day ranges and recurring
          // series included. The run's first day gets the chip/fill label,
          // later days get a continuation bar.
          const dayEntries: DayEntry[] = [];
          for (const ev of state.events) {
            const start = occurrenceStartFor(ev, cell.iso);
            if (!start) continue;
            dayEntries.push({
              ev,
              kind: start === cell.iso ? 'start' : 'middle',
              multiDay: ev.endDate !== undefined && ev.endDate > ev.date,
            });
          }

          // Multi-day events get their own strip pinned to the top of the cell,
          // above the rest, so the bars form a continuous line across days.
          const multiDayHtml = dayEntries
            .filter((entry) => entry.multiDay)
            .map(renderEntry)
            .join('');

          // Whole-cell (all-day) events always render on top of regular chips
          // inside the centred group, regardless of creation order.
          const fillEvent = dayEntries.find((entry) => entry.kind === 'start' && entry.ev.fill)?.ev;
          const eventsHtml = dayEntries
            .filter((entry) => !entry.multiDay)
            .sort((a, b) => Number(b.ev.fill ?? false) - Number(a.ev.fill ?? false))
            .map(renderEntry)
            .join('');

          const classes = ['cell'];
          if (!cell.inMonth) classes.push('other-month');
          if (fillEvent) classes.push('cell-filled');
          const fillStyle = fillEvent
            ? ` style="background:${fillEvent.noBg ? 'transparent' : esc(fillEvent.color)}"`
            : '';
          const multiDayStrip = multiDayHtml ? `<div class="cell-allday">${multiDayHtml}</div>` : '';
          return `<div class="${classes.join(' ')}" data-iso="${cell.iso}"${fillStyle}>
            <span class="day-num">${cell.day}</span>
            ${multiDayStrip}
            <div class="cell-events">${eventsHtml}</div>
          </div>`;
        })
        .join(''),
    )
    .join('');
}

/** Legend categories are scoped to the displayed month. */
export function renderLegend(state: AppState): void {
  const container = el('legend-items');
  const categories = state.categories ?? [];
  if (categories.length === 0) {
    container.innerHTML = '<span class="legend-empty">Sin categorías todavía</span>';
    return;
  }
  container.innerHTML = categories
    .map(
      (cat) => `<div class="legend-item" data-cat-id="${esc(cat.id)}" title="Clic en el nombre para editar · Con el pincel, clic en el cuadrito de color">
        <span class="legend-swatch" style="background:${esc(cat.color)}"></span>
        <span class="legend-name">${esc(cat.name)}</span>
        <button type="button" class="legend-delete" data-cat-delete="${esc(cat.id)}" data-export-exclude title="Eliminar">×</button>
      </div>`,
    )
    .join('');
}

/** Old notes carry <font size> steps; step 3 renders 16px, bigger than the
 *  default. Map them onto the preset classes so the stylesheet owns size and
 *  line-height for text that was styled before the presets existed. */
const LEGACY_NOTE_SIZE_CLASS: Record<string, string> = {
  '1': 'note-size-small',
  '3': 'note-size-normal',
  '5': 'note-size-large',
  '7': 'note-size-large', // "Muy grande" is retired; keep it as the large step
};

function normalizeNoteSizes(notes: HTMLElement): void {
  for (const font of Array.from(notes.querySelectorAll('font[size]'))) {
    const className = LEGACY_NOTE_SIZE_CLASS[font.getAttribute('size') ?? ''];
    if (!className) continue;
    font.removeAttribute('size');
    font.classList.add(className);
  }
}

/** Notes store rich HTML per month; keep focus while the user types. */
export function renderNotes(state: AppState, force = false): void {
  const notes = el<HTMLElement>('notes');
  if (force || document.activeElement !== notes) {
    notes.innerHTML = state.notesByMonth[monthKey(state.year, state.monthIndex)] ?? '';
    normalizeNoteSizes(notes);
  }
}

export function applySeason(state: AppState): void {
  document.body.dataset.season = state.season;
  document.body.dataset.theme = state.theme;
  const select = el<HTMLSelectElement>('season-select');
  if (select.value !== state.season) select.value = state.season;
  const themeBtn = el<HTMLButtonElement>('theme-toggle');
  const dark = state.theme === 'oscuro';
  themeBtn.textContent = dark ? '☀️' : '🌙';
  themeBtn.title = dark ? 'Modo claro' : 'Modo oscuro';
}

/** Full UI refresh from state. */
export function renderAll(state: AppState): void {
  renderTitle(state);
  renderBrush(state);
  renderGrid(state);
  renderLegend(state);
  renderNotes(state);
  renderDecorations(state.season);
  applySeason(state);
}
