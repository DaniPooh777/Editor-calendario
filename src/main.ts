/** Entry point: wires UI events to state. State is the only source of truth. */

import './style.css';
import { copyCalendarImage } from './capture';
import { renderAll, renderBrush, renderGrid, renderTitle } from './render';
import {
  BRUSH_COLORS,
  loadState,
  saveState,
  uid,
  type AppState,
  type CalendarEvent,
} from './state';

let state: AppState = loadState();

/** Id of the event being edited in the dialog ('' = creating new). */
let editingEventId = '';

function commit(): void {
  saveState(state);
  renderAll(state);
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

// ---------------------------------------------------------------------------
// Toolbar: season, brush, copy button
// ---------------------------------------------------------------------------

el<HTMLSelectElement>('season-select').addEventListener('change', (e) => {
  state.season = (e.target as HTMLSelectElement).value as AppState['season'];
  commit();
});

function setBrush(color: string): void {
  state.brushColor = color;
  saveState(state);
  renderBrush(state);
}

document.querySelector('.brush')?.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-color]');
  if (!target) return;
  setBrush(target.dataset.color ?? '');
});

const copyBtn = el<HTMLButtonElement>('copy-btn');
const copyLabel = el('copy-btn-label');
copyBtn.addEventListener('click', async () => {
  copyBtn.disabled = true;
  copyLabel.textContent = 'Copiando…';
  try {
    const mode = await copyCalendarImage();
    copyLabel.textContent = mode === 'clipboard' ? '¡Copiado!' : 'Imagen descargada';
  } catch (err) {
    console.error(err);
    copyLabel.textContent = 'Error al copiar';
  } finally {
    window.setTimeout(() => {
      copyLabel.textContent = 'Copiar Calendario';
      copyBtn.disabled = false;
    }, 2000);
  }
});

// ---------------------------------------------------------------------------
// Month navigation
// ---------------------------------------------------------------------------

function changeMonth(delta: number): void {
  const next = new Date(state.year, state.monthIndex + delta, 1);
  state.year = next.getFullYear();
  state.monthIndex = next.getMonth();
  saveState(state);
  renderTitle(state);
  renderGrid(state);
}

el('prev-month').addEventListener('click', () => changeMonth(-1));
el('next-month').addEventListener('click', () => changeMonth(1));

// ---------------------------------------------------------------------------
// Event dialog (create / edit / delete)
// ---------------------------------------------------------------------------

const eventDialog = el<HTMLDialogElement>('event-dialog');
const eventForm = el<HTMLFormElement>('event-form');
const eventIso = el<HTMLInputElement>('event-iso');
const eventId = el<HTMLInputElement>('event-id');
const eventTitle = el<HTMLInputElement>('event-title');
const eventTime = el<HTMLInputElement>('event-time');
const eventColor = el<HTMLInputElement>('event-color');
const eventDelete = el<HTMLButtonElement>('event-delete');
const eventHeading = el('event-dialog-heading');

function openCreateDialog(iso: string): void {
  editingEventId = '';
  eventForm.reset();
  eventIso.value = iso;
  eventId.value = '';
  eventHeading.textContent = 'Nuevo evento';
  eventColor.value = state.brushColor || BRUSH_COLORS[0];
  eventDelete.hidden = true;
  eventDialog.showModal();
  eventTitle.focus();
}

function openEditDialog(ev: CalendarEvent): void {
  editingEventId = ev.id;
  eventIso.value = ev.date;
  eventId.value = ev.id;
  eventTitle.value = ev.title;
  eventTime.value = ev.time ?? '';
  eventColor.value = ev.color;
  eventHeading.textContent = 'Editar evento';
  eventDelete.hidden = false;
  eventDialog.showModal();
  eventTitle.focus();
}

eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = eventTitle.value.trim();
  if (!title) return;
  const time = eventTime.value.trim();

  if (editingEventId) {
    const ev = state.events.find((x) => x.id === editingEventId);
    if (ev) {
      ev.title = title;
      ev.time = time || undefined;
      ev.color = eventColor.value;
    }
  } else {
    state.events.push({
      id: uid(),
      date: eventIso.value,
      title,
      time: time || undefined,
      color: eventColor.value,
    });
  }

  eventDialog.close();
  commit();
});

eventDelete.addEventListener('click', () => {
  if (!editingEventId) return;
  state.events = state.events.filter((x) => x.id !== editingEventId);
  eventDialog.close();
  commit();
});

el('event-cancel').addEventListener('click', () => eventDialog.close());

// Cell and chip clicks (delegated on the grid).
el('grid').addEventListener('click', (e) => {
  const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-event-id]');
  if (chip) {
    const ev = state.events.find((x) => x.id === chip.dataset.eventId);
    if (ev) openEditDialog(ev);
    return;
  }
  const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-iso]');
  if (cell?.dataset.iso) openCreateDialog(cell.dataset.iso);
});

// ---------------------------------------------------------------------------
// Categories (legend)
// ---------------------------------------------------------------------------

const categoryDialog = el<HTMLDialogElement>('category-dialog');
const categoryForm = el<HTMLFormElement>('category-form');
const categoryName = el<HTMLInputElement>('category-name');
const categoryColor = el<HTMLInputElement>('category-color');

el('add-category').addEventListener('click', () => {
  categoryForm.reset();
  categoryColor.value = state.brushColor || BRUSH_COLORS[2];
  categoryDialog.showModal();
  categoryName.focus();
});

categoryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = categoryName.value.trim();
  if (!name) return;
  state.categories.push({ id: uid(), name, color: categoryColor.value });
  categoryDialog.close();
  commit();
});

el('category-cancel').addEventListener('click', () => categoryDialog.close());

el('legend-items').addEventListener('click', (e) => {
  const deleteBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-cat-delete]');
  if (deleteBtn?.dataset.catDelete) {
    state.categories = state.categories.filter((c) => c.id !== deleteBtn.dataset.catDelete);
    commit();
    return;
  }
  // Click a legend item with a brush color selected → recolor category.
  const item = (e.target as HTMLElement).closest<HTMLElement>('[data-cat-id]');
  if (item?.dataset.catId && state.brushColor) {
    const cat = state.categories.find((c) => c.id === item.dataset.catId);
    if (cat) {
      cat.color = state.brushColor;
      commit();
    }
  }
});

// ---------------------------------------------------------------------------
// Notes (free text, right panel)
// ---------------------------------------------------------------------------

el<HTMLTextAreaElement>('notes').addEventListener('input', (e) => {
  state.notes = (e.target as HTMLTextAreaElement).value;
  saveState(state);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

renderAll(state);
