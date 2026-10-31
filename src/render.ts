/** DOM rendering. Reads state, writes DOM. Never mutates state. */

import { getMonthGrid, monthKey, MONTHS_ES, WEEKDAYS_ES } from './calendar';
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
  return `<button type="button" class="event-chip" data-event-id="${esc(ev.id)}" style="background:${esc(ev.color)}" title="Editar: ${esc(stripTags(ev.title))}">${ev.title}${time}</button>`;
}

/** Whole-cell event (e.g. a holiday): transparent label over the painted cell. */
function fillLabel(ev: CalendarEvent): string {
  const time = ev.time ? `<small>${esc(ev.time)}</small>` : '';
  return `<button type="button" class="fill-label" data-event-id="${esc(ev.id)}" title="Editar: ${esc(stripTags(ev.title))}">${ev.title}${time}</button>`;
}

export function renderGrid(state: AppState): void {
  const grid = el('grid');
  const weeks = getMonthGrid(state.year, state.monthIndex);
  const todayISO = (() => {
    const n = new Date();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    return `${n.getFullYear()}-${m}-${d}`;
  })();

  grid.innerHTML = weeks
    .map((week) =>
      week
        .map((cell) => {
          // Whole-cell (all-day) events always render on top, regardless of
          // creation order: fill labels first, then regular chips.
          const dayEvents = state.events
            .filter((ev) => ev.date === cell.iso)
            .sort((a, b) => Number(b.fill ?? false) - Number(a.fill ?? false));
          const fillEvent = dayEvents.find((ev) => ev.fill);
          const eventsHtml = dayEvents
            .map((ev) => (ev.fill ? fillLabel(ev) : eventChip(ev)))
            .join('');
          const classes = ['cell'];
          if (!cell.inMonth) classes.push('other-month');
          if (fillEvent) classes.push('cell-filled');
          if (cell.iso === todayISO) classes.push('today');
          const fillStyle = fillEvent ? ` style="background:${esc(fillEvent.color)}"` : '';
          return `<div class="${classes.join(' ')}" data-iso="${cell.iso}"${fillStyle}>
            <span class="day-num">${cell.day}</span>
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
  const categories = state.categoriesByMonth[monthKey(state.year, state.monthIndex)] ?? [];
  if (categories.length === 0) {
    container.innerHTML = '<span class="legend-empty">Sin categorías todavía</span>';
    return;
  }
  container.innerHTML = categories
    .map(
      (cat) => `<div class="legend-item" data-cat-id="${esc(cat.id)}" title="Clic con el pincel para cambiar el color">
        <span class="legend-swatch" style="background:${esc(cat.color)}"></span>
        <span class="legend-name">${esc(cat.name)}</span>
        <button type="button" class="legend-delete" data-cat-delete="${esc(cat.id)}" data-export-exclude title="Eliminar">×</button>
      </div>`,
    )
    .join('');
}

/** Notes store rich HTML per month; keep focus while the user types. */
export function renderNotes(state: AppState, force = false): void {
  const notes = el<HTMLElement>('notes');
  if (force || document.activeElement !== notes) {
    notes.innerHTML = state.notesByMonth[monthKey(state.year, state.monthIndex)] ?? '';
  }
}

export function applySeason(state: AppState): void {
  document.body.dataset.season = state.season;
  const select = el<HTMLSelectElement>('season-select');
  if (select.value !== state.season) select.value = state.season;
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
