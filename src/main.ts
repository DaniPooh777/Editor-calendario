/** Entry point: wires UI events to state. State is the only source of truth. */

import './style.css';
import { copyCalendarImage } from './capture';
import { monthKey } from './calendar';
import { renderAll, renderBrush, renderGrid, renderNotes, renderTitle, stripTags } from './render';
import {
  BRUSH_COLORS,
  loadState,
  loadStateSmart,
  saveState,
  uid,
  type AppState,
  type CalendarEvent,
  type Category,
} from './state';

// Instant placeholder from localStorage so wiring can proceed synchronously;
// it is replaced by the newest copy (disk vs localStorage) right after boot.
// The app stays inert until that resolves, so nobody can edit a stale state.
let state: AppState = loadState();
document.querySelector('.app')?.setAttribute('inert', '');

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

/** Shared N/C/S toolbar wiring for any contenteditable area. */
function wireFormatToolbar(toolbar: HTMLElement, editable: HTMLElement, onPersist: () => void): void {
  // Keep the text selection alive when a format button is pressed.
  toolbar.addEventListener('mousedown', (e) => e.preventDefault());
  toolbar.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-cmd]');
    if (!btn?.dataset.cmd) return;
    const sel = document.getSelection();
    if (!editable.contains(sel?.anchorNode ?? null)) {
      editable.focus();
    }
    document.execCommand(btn.dataset.cmd);
    onPersist();
  });
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
  // Notes are per month, so swap them with the grid. The legend is fixed and
  // shared by every month, so it stays as is. (force: the caret may still sit
  // inside the notes area.)
  renderNotes(state, true);
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
const eventTime = el<HTMLInputElement>('event-time');
const eventColor = el<HTMLInputElement>('event-color');
const eventFill = el<HTMLInputElement>('event-fill');
const eventNoBg = el<HTMLInputElement>('event-nobg');
const eventTitle = el<HTMLInputElement>('event-title');
const eventDelete = el<HTMLButtonElement>('event-delete');
const eventHeading = el('event-dialog-heading');

function openCreateDialog(iso: string): void {
  editingEventId = '';
  eventForm.reset();
  eventTitle.value = '';
  eventIso.value = iso;
  eventId.value = '';
  eventHeading.textContent = 'Nuevo evento';
  eventColor.value = state.brushColor || BRUSH_COLORS[0];
  eventFill.checked = false;
  eventNoBg.checked = false;
  eventDelete.hidden = true;
  eventDialog.showModal();
  eventTitle.focus();
}

function openEditDialog(ev: CalendarEvent): void {
  editingEventId = ev.id;
  eventIso.value = ev.date;
  eventId.value = ev.id;
  // Titles are plain text now; strip tags left over from rich-title data.
  eventTitle.value = stripTags(ev.title);
  eventTime.value = ev.time ?? '';
  eventColor.value = ev.color;
  eventFill.checked = ev.fill === true;
  eventNoBg.checked = ev.noBg === true;
  eventHeading.textContent = 'Editar evento';
  eventDelete.hidden = false;
  eventDialog.showModal();
  eventTitle.focus();
}

eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = eventTitle.value.trim();
  if (!title) {
    eventTitle.focus();
    return;
  }
  const time = eventTime.value.trim();

  if (editingEventId) {
    const ev = state.events.find((x) => x.id === editingEventId);
    if (ev) {
      ev.title = title;
      ev.time = time || undefined;
      ev.color = eventColor.value;
      ev.fill = eventFill.checked ? true : undefined;
      ev.noBg = eventNoBg.checked ? true : undefined;
    }
  } else {
    state.events.push({
      id: uid(),
      date: eventIso.value,
      title,
      time: time || undefined,
      color: eventColor.value,
      fill: eventFill.checked ? true : undefined,
      noBg: eventNoBg.checked ? true : undefined,
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
const categoryHeading = el('category-dialog-heading');
let editingCategoryId = '';

el('add-category').addEventListener('click', () => {
  editingCategoryId = '';
  categoryForm.reset();
  categoryColor.value = state.brushColor || BRUSH_COLORS[2];
  categoryHeading.textContent = 'Nueva categoría';
  categoryDialog.showModal();
  categoryName.focus();
});

function openEditCategoryDialog(cat: Category): void {
  editingCategoryId = cat.id;
  categoryName.value = cat.name;
  categoryColor.value = cat.color;
  categoryHeading.textContent = 'Editar categoría';
  categoryDialog.showModal();
  categoryName.focus();
}

categoryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = categoryName.value.trim();
  if (!name) return;
  if (editingCategoryId) {
    const cat = state.categories.find((c) => c.id === editingCategoryId);
    if (cat) {
      cat.name = name;
      cat.color = categoryColor.value;
    }
  } else {
    state.categories.push({ id: uid(), name, color: categoryColor.value });
  }
  categoryDialog.close();
  commit();
});

el('category-cancel').addEventListener('click', () => categoryDialog.close());

el('legend-items').addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const deleteBtn = target.closest<HTMLElement>('[data-cat-delete]');
  if (deleteBtn?.dataset.catDelete) {
    state.categories = state.categories.filter((c) => c.id !== deleteBtn.dataset.catDelete);
    commit();
    return;
  }

  const item = target.closest<HTMLElement>('[data-cat-id]');
  if (!item?.dataset.catId) return;
  const cat = state.categories.find((c) => c.id === item.dataset.catId);
  if (!cat) return;

  // Click the colour swatch with a brush colour → recolour.
  if (target.closest('.legend-swatch') && state.brushColor) {
    cat.color = state.brushColor;
    commit();
    return;
  }

  // Anywhere else (including the name) → edit the category.
  openEditCategoryDialog(cat);
});

// ---------------------------------------------------------------------------
// Notes (rich HTML per month: bold / italic / underline)
// ---------------------------------------------------------------------------

const notesEl = el<HTMLElement>('notes');

function persistNotes(): void {
  state.notesByMonth[monthKey(state.year, state.monthIndex)] = notesEl.innerHTML;
  saveState(state);
}

notesEl.addEventListener('input', persistNotes);

// Enter starts a new dashed item instead of a bare line break, and the
// spacing between items is tighter than a soft wrap (see .notes-area div).
notesEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  e.preventDefault();
  document.execCommand('insertHTML', false, '<div>-&nbsp;</div>');
});

wireFormatToolbar(el('notes-toolbar'), notesEl, persistNotes);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

renderAll(state);

// Swap in the newest copy (disk vs localStorage) once the server answers,
// then unlock the UI. Until then the app is inert: no edits against stale data.
void (async () => {
  try {
    state = await loadStateSmart();
    renderAll(state);
  } finally {
    document.querySelector('.app')?.removeAttribute('inert');
  }
})();
