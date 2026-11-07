/** Entry point: wires UI events to state. State is the only source of truth. */

import './style.css';
import { copyCalendarImage } from './capture';
import { addDaysISO, daysBetweenISO, isoWeekday, monthKey, occurrenceIndex, occurrenceStartFor, toISO, toTimeInputValue } from './calendar';
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
/** Day of the series occurrence that was clicked ('' when creating). */
let editingOccurrenceIso = '';

function commit(): void {
  saveState(state);
  renderAll(state);
}

// ---------------------------------------------------------------------------
// Undo for events and legend (Ctrl+Z). Notes keep their native text undo.
// ---------------------------------------------------------------------------

interface UndoSnapshot {
  events: CalendarEvent[];
  categories: Category[];
}

const UNDO_LIMIT = 50;
const undoStack: UndoSnapshot[] = [];

/** Snapshot events + categories before a mutation so Ctrl+Z can revert it. */
function pushUndo(): void {
  undoStack.push({
    events: JSON.parse(JSON.stringify(state.events)) as CalendarEvent[],
    categories: JSON.parse(JSON.stringify(state.categories)) as Category[],
  });
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
}

document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
  const target = e.target as HTMLElement | null;
  // Inputs, selects and the notes area keep their own native undo.
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
  const snapshot = undoStack.pop();
  if (!snapshot) return;
  e.preventDefault();
  state.events = snapshot.events;
  state.categories = snapshot.categories;
  commit();
});

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

/** Shared N/C/S toolbar wiring for any contenteditable area. */
function wireFormatToolbar(toolbar: HTMLElement, editable: HTMLElement, onPersist: () => void): void {
  // Keep the text selection alive when a format button is pressed. Selects are
  // excluded: they need their native mousedown to open the dropdown.
  toolbar.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('select')) return;
    e.preventDefault();
  });
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

  // Font-size presets (Chica/Normal/Grande/Muy grande → fontSize 1/3/5/7).
  // Clicking the select blurs the editable, so the selection is snapshotted on
  // mousedown and restored before execCommand applies the size to it.
  const sizeSelect = toolbar.querySelector<HTMLSelectElement>('.notes-font-size');
  if (sizeSelect) {
    let savedRange: Range | null = null;
    sizeSelect.addEventListener('mousedown', () => {
      const sel = document.getSelection();
      if (sel?.rangeCount && editable.contains(sel.anchorNode)) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    });
    sizeSelect.addEventListener('change', () => {
      const value = sizeSelect.value;
      sizeSelect.selectedIndex = 0; // back to the "Tamaño" placeholder
      if (!value) return;
      const sel = document.getSelection();
      if (savedRange && sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
      if (!editable.contains(sel?.anchorNode ?? null)) {
        editable.focus();
        if (savedRange && sel) {
          sel.removeAllRanges();
          sel.addRange(savedRange);
        }
      }
      document.execCommand('fontSize', false, value);
      onPersist();
    });
  }
}

// ---------------------------------------------------------------------------
// Toolbar: season, brush, copy button
// ---------------------------------------------------------------------------

el<HTMLSelectElement>('season-select').addEventListener('change', (e) => {
  state.season = (e.target as HTMLSelectElement).value as AppState['season'];
  commit();
});

el<HTMLButtonElement>('theme-toggle').addEventListener('click', () => {
  state.theme = state.theme === 'oscuro' ? 'claro' : 'oscuro';
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
const eventEnd = el<HTMLInputElement>('event-end');
const eventRecurrence = el<HTMLSelectElement>('event-recurrence');
const eventDaysField = el<HTMLDivElement>('event-weekly');
const eventInterval = el<HTMLInputElement>('event-interval');
const eventCountField = el<HTMLDivElement>('event-count-field');
const eventCount = el<HTMLInputElement>('event-count');
const eventDayInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>('#event-days input[type="checkbox"]'),
);
const eventColor = el<HTMLInputElement>('event-color');
const eventFill = el<HTMLInputElement>('event-fill');
const eventNoBg = el<HTMLInputElement>('event-nobg');
const eventTitle = el<HTMLInputElement>('event-title');
const eventDelete = el<HTMLButtonElement>('event-delete');
const eventHeading = el('event-dialog-heading');

/** Weekday of the dialog's start day (0 = Monday … 6 = Sunday). */
function dialogStartWeekday(): number {
  return isoWeekday(eventIso.value || toISO(new Date()));
}

/** Picked weekdays, ascending; [] means "the weekday of the start day". */
function checkedRecurrenceDays(): number[] {
  return eventDayInputs
    .filter((input) => input.checked)
    .map((input) => Number(input.value))
    .sort((a, b) => a - b);
}

function setRecurrenceDays(days: number[]): void {
  for (const input of eventDayInputs) input.checked = days.includes(Number(input.value));
}

/**
 * The weekday and week-interval toggles only make sense for a weekly series;
 * the repeat count applies to any series. Prefilling keeps a freshly switched
 * "Cada semana" equal to the old rule: the start weekday.
 */
function syncRecurrenceFields(prefillWhenEmpty: boolean): void {
  const weekly = eventRecurrence.value === 'semanal';
  eventDaysField.hidden = !weekly;
  eventCountField.hidden = eventRecurrence.value === '';
  if (weekly && prefillWhenEmpty && checkedRecurrenceDays().length === 0) {
    setRecurrenceDays([dialogStartWeekday()]);
  }
}

eventRecurrence.addEventListener('change', () => syncRecurrenceFields(true));

function openCreateDialog(iso: string): void {
  editingEventId = '';
  editingOccurrenceIso = '';
  eventForm.reset();
  eventTitle.value = '';
  eventIso.value = iso;
  eventId.value = '';
  eventHeading.textContent = 'Nuevo evento';
  eventColor.value = state.brushColor || BRUSH_COLORS[0];
  eventFill.checked = false;
  // Brush ✕ (no colour) means "no background": pre-check the noBg box.
  eventNoBg.checked = state.brushColor === '';
  eventEnd.value = '';
  eventRecurrence.value = '';
  eventInterval.value = '1';
  eventCount.value = '';
  setRecurrenceDays([]);
  syncRecurrenceFields(false);
  eventDelete.hidden = true;
  eventDialog.showModal();
  eventTitle.focus();
}

function openEditDialog(ev: CalendarEvent, occurrenceIso: string): void {
  editingEventId = ev.id;
  editingOccurrenceIso = occurrenceIso;
  eventIso.value = ev.date;
  eventId.value = ev.id;
  // Titles are plain text now; strip tags left over from rich-title data.
  eventTitle.value = stripTags(ev.title);
  // The time field is a native hour/minute picker, so legacy free-text values
  // ("9:00") are normalised to the "HH:MM" it accepts.
  eventTime.value = toTimeInputValue(ev.time);
  eventColor.value = ev.color;
  eventFill.checked = ev.fill === true;
  eventNoBg.checked = ev.noBg === true;
  eventEnd.value = ev.endDate ?? '';
  eventRecurrence.value = ev.recurrence ?? '';
  // Series saved before the weekday picker fall back to the start weekday.
  setRecurrenceDays(ev.recurrenceDays ?? []);
  eventInterval.value = String(ev.recurrenceInterval ?? 1);
  eventCount.value = ev.recurrenceCount ? String(ev.recurrenceCount) : '';
  syncRecurrenceFields(true);
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
  // "Hasta" only counts when it is after the start day (YYYY-MM-DD compares
  // lexicographically). A single-day event leaves endDate undefined.
  const endDate = eventEnd.value && eventEnd.value > eventIso.value ? eventEnd.value : undefined;
  const recurrence = (eventRecurrence.value || undefined) as CalendarEvent['recurrence'];
  // Picked weekdays only apply to a weekly series; an empty pick keeps the
  // start weekday, which is what "Cada semana" always meant.
  const pickedDays = recurrence === 'semanal' ? checkedRecurrenceDays() : [];
  const recurrenceDays = pickedDays.length ? pickedDays : undefined;
  // "Cada N semanas": clamped to 1–52 and dropped when it is just every week.
  const rawInterval = Math.floor(Number(eventInterval.value));
  const interval = Number.isFinite(rawInterval) ? Math.min(52, Math.max(1, rawInterval)) : 1;
  const recurrenceInterval = recurrence === 'semanal' && interval > 1 ? interval : undefined;
  // "Repetir (veces)": empty or nonsense means the series never ends.
  const rawCount = Math.floor(Number(eventCount.value));
  const total = Number.isFinite(rawCount) && rawCount >= 1 ? Math.min(999, rawCount) : 0;
  const recurrenceCount = recurrence && total ? total : undefined;

  pushUndo();
  if (editingEventId) {
    const ev = state.events.find((x) => x.id === editingEventId);
    if (ev) {
      ev.title = title;
      ev.time = time || undefined;
      ev.color = eventColor.value;
      ev.fill = eventFill.checked ? true : undefined;
      ev.noBg = eventNoBg.checked ? true : undefined;
      ev.endDate = endDate;
      ev.recurrence = recurrence;
      ev.recurrenceDays = recurrenceDays;
      ev.recurrenceInterval = recurrenceInterval;
      ev.recurrenceCount = recurrenceCount;
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
      endDate,
      recurrence,
      recurrenceDays,
      recurrenceInterval,
      recurrenceCount,
    });
  }

  eventDialog.close();
  commit();
});

eventDelete.addEventListener('click', () => {
  const ev = state.events.find((x) => x.id === editingEventId);
  if (!ev) return;
  pushUndo();
  // Deleting a repeated occurrence removes it and every later one, never the
  // earlier ones: the series is cut right before the clicked occurrence.
  // Clicking the first occurrence (or a one-off event) deletes the whole event.
  const cutIndex = ev.recurrence && editingOccurrenceIso
    ? occurrenceIndex(ev, editingOccurrenceIso)
    : 0;
  if (cutIndex > 1) {
    ev.recurrenceCount = cutIndex - 1;
  } else {
    state.events = state.events.filter((x) => x.id !== editingEventId);
  }
  eventDialog.close();
  commit();
});

el('event-cancel').addEventListener('click', () => eventDialog.close());

// Cell and chip clicks (delegated on the grid).
const gridEl = el('grid');

gridEl.addEventListener('click', (e) => {
  const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-event-id]');
  if (chip) {
    const ev = state.events.find((x) => x.id === chip.dataset.eventId);
    if (ev) {
      const cellIso = chip.closest<HTMLElement>('[data-iso]')?.dataset.iso ?? '';
      // Which occurrence of the series was clicked decides what delete removes.
      openEditDialog(ev, occurrenceStartFor(ev, cellIso) ?? ev.date);
    }
    return;
  }
  const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-iso]');
  if (cell?.dataset.iso) openCreateDialog(cell.dataset.iso);
});

// Drag & drop: grab a chip (or a continuation bar) and drop it on another
// day. A range keeps its length: the whole block shifts by the same delta.
let draggedEventId = '';
let draggedFromIso = '';

gridEl.addEventListener('dragstart', (e) => {
  const item = (e.target as HTMLElement).closest<HTMLElement>('[data-event-id]');
  if (!item?.dataset.eventId) {
    e.preventDefault();
    return;
  }
  draggedEventId = item.dataset.eventId;
  draggedFromIso = item.closest<HTMLElement>('[data-iso]')?.dataset.iso ?? '';
  item.classList.add('dragging');
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedEventId);
  }
});

gridEl.addEventListener('dragend', () => {
  draggedEventId = '';
  draggedFromIso = '';
  gridEl.querySelectorAll('.dragging, .drop-target').forEach((node) => {
    node.classList.remove('dragging', 'drop-target');
  });
});

gridEl.addEventListener('dragover', (e) => {
  const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-iso]');
  if (!cell || !draggedEventId) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  cell.classList.add('drop-target');
});

gridEl.addEventListener('dragleave', (e) => {
  const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-iso]');
  if (!cell) return;
  // Ignore transitions between descendants of the same cell.
  const related = e.relatedTarget as Node | null;
  if (related && cell.contains(related)) return;
  cell.classList.remove('drop-target');
});

gridEl.addEventListener('drop', (e) => {
  const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-iso]');
  if (!cell?.dataset.iso || !draggedEventId) return;
  e.preventDefault();
  cell.classList.remove('drop-target');
  const ev = state.events.find((x) => x.id === draggedEventId);
  const delta = draggedFromIso ? daysBetweenISO(draggedFromIso, cell.dataset.iso) : 0;
  draggedEventId = '';
  draggedFromIso = '';
  if (!ev || delta === 0) return;
  pushUndo();
  ev.date = addDaysISO(ev.date, delta);
  if (ev.endDate) ev.endDate = addDaysISO(ev.endDate, delta);
  // A picked-day series follows the drag too: shifting the anchor by N days
  // without shifting the weekdays would move the start out of its own series.
  if (ev.recurrenceDays?.length) {
    ev.recurrenceDays = ev.recurrenceDays.map((day) => (((day + delta) % 7) + 7) % 7).sort((a, b) => a - b);
  }
  commit();
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
  pushUndo();
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
    pushUndo();
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
    pushUndo();
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

// Top-level line div inside #notes that contains the caret (or null).
function currentNoteLine(): HTMLElement | null {
  let node: Node | null = document.getSelection()?.anchorNode ?? null;
  while (node && node !== notesEl) {
    if (node.parentNode === notesEl && node.nodeType === Node.ELEMENT_NODE) {
      return node as HTMLElement;
    }
    node = node.parentNode;
  }
  return null;
}

// Tab / Shift+Tab indent the current line inside the notes only; outside the
// notes this listener never fires, so native focus navigation stays intact.
// Enter starts a new dashed item instead of a bare line break, inheriting the
// indent level of the line it follows (see .notes-area div / [data-indent]).
notesEl.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault(); // never move focus out of the contenteditable
    const line = currentNoteLine();
    if (!line) return;
    const level = Number(line.dataset.indent ?? '0');
    const next = e.shiftKey ? Math.max(0, level - 1) : Math.min(3, level + 1);
    if (next === 0) delete line.dataset.indent;
    else line.dataset.indent = String(next);
    persistNotes();
    return;
  }
  if (e.key !== 'Enter' || e.shiftKey) return;
  e.preventDefault();
  const prevIndent = currentNoteLine()?.dataset.indent;
  const attr = prevIndent ? ` data-indent="${prevIndent}"` : '';
  document.execCommand('insertHTML', false, `<div${attr}>-&nbsp;</div>`);
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
