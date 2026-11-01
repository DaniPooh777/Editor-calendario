/**
 * App state: single source of truth.
 *
 * Every change is persisted twice: instantly to localStorage (fast cache) and,
 * a moment later, to the local server, which writes datos-calendario.json to
 * disk. On boot the newest of the two wins, so the calendar survives browser
 * privacy wipes, InPrivate windows and origin changes.
 */

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface CalendarEvent {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** Title as HTML (supports bold / italic / underline). */
  title: string;
  /** Free text like "9:00". Optional. */
  time?: string;
  color: string;
  /** When true the event paints the whole cell (e.g. a holiday). */
  fill?: boolean;
  /** When true the event renders with no background (just the text). */
  noBg?: boolean;
}

export interface AppState {
  year: number;
  monthIndex: number;
  season: 'primavera' | 'verano' | 'otono' | 'invierno';
  /** Current brush color; '' means no color selected. */
  brushColor: string;
  /** Legend categories: one fixed list shared by every month. */
  categories: Category[];
  events: CalendarEvent[];
  /** Rich HTML notes (bold/italic/underline) keyed by "YYYY-MM". */
  notesByMonth: Record<string, string>;
}

const STORAGE_KEY = 'editor-calendario-v1';
/** ISO timestamp of the last localStorage write, used to pick the newest copy. */
const SAVED_AT_KEY = 'editor-calendario-v1-savedAt';
const SERVER_STATE_URL = '/api/state';
/** Trailing debounce for server writes (typing notes fires per keystroke). */
const SERVER_PUSH_DEBOUNCE_MS = 250;

/** Palette shown in the toolbar brush, matching the prototype. */
export const BRUSH_COLORS = [
  '#d9c7a7',
  '#c4a484',
  '#a8b894',
  '#e8d49a',
  '#e8b4a0',
  '#8fb8b8',
] as const;

export function defaultState(): AppState {
  const now = new Date();
  return {
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
    season: 'otono',
    brushColor: BRUSH_COLORS[0],
    categories: [],
    events: [],
    notesByMonth: {},
  };
}

/** Merge any stored shape (including legacy formats) into a full AppState. */
function normalizeState(parsed: Partial<AppState> & {
  notes?: unknown;
  categories?: unknown;
  categoriesByMonth?: unknown;
}): AppState {
  const base = defaultState();

  // Merge per-month legends (old format) into the single fixed list.
  const seenIds = new Set<string>();
  const categories: Category[] = [];
  const addCategories = (list: unknown): void => {
    if (!Array.isArray(list)) return;
    for (const cat of list as Category[]) {
      if (cat && typeof cat.id === 'string' && !seenIds.has(cat.id)) {
        seenIds.add(cat.id);
        categories.push(cat);
      }
    }
  };
  // Legacy global list first (oldest), then the per-month ones it replaced.
  addCategories(parsed.categories);
  if (parsed.categoriesByMonth && typeof parsed.categoriesByMonth === 'object' && !Array.isArray(parsed.categoriesByMonth)) {
    for (const value of Object.values(parsed.categoriesByMonth as Record<string, unknown>)) {
      addCategories(value);
    }
  }
  addCategories((parsed as AppState).categories);

  const notesByMonth: Record<string, string> =
    parsed.notesByMonth && typeof parsed.notesByMonth === 'object' && !Array.isArray(parsed.notesByMonth)
      ? { ...(parsed.notesByMonth as Record<string, string>) }
      : {};

  const now = new Date();
  const legacyKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Migrate legacy single-notes string into the month it is viewed in.
  if (typeof parsed.notes === 'string' && parsed.notes !== '') {
    notesByMonth[legacyKey] ??= parsed.notes;
  }

  const merged = {
    ...base,
    ...parsed,
    categories,
    events: Array.isArray(parsed.events) ? parsed.events : [],
    notesByMonth,
    brushColor: typeof parsed.brushColor === 'string' ? parsed.brushColor : base.brushColor,
  } as AppState & { notes?: unknown; categoriesByMonth?: unknown };
  delete merged.notes;
  delete merged.categoriesByMonth;
  return merged;
}

/** Synchronous fallback: whatever localStorage holds (or the default state). */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

/** Disk copy served by server.mjs, or null when unreachable/absent. */
export async function fetchServerState(): Promise<{ savedAt: string; state: AppState } | null> {
  try {
    const res = await fetch(SERVER_STATE_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (data && typeof data === 'object' && 'state' in data && typeof (data as { state: unknown }).state === 'object' && (data as { state: unknown }).state !== null) {
      const envelope = data as { savedAt?: unknown; state: Parameters<typeof normalizeState>[0] };
      return {
        savedAt: typeof envelope.savedAt === 'string' ? envelope.savedAt : '',
        state: normalizeState(envelope.state),
      };
    }
    // Legacy: a raw state object stored directly, without the envelope.
    return { savedAt: '', state: normalizeState(data as Parameters<typeof normalizeState>[0]) };
  } catch {
    return null;
  }
}

/**
 * Boot-time load: use whichever copy is newest, disk or localStorage.
 * When localStorage wins, the disk copy is healed immediately so a later
 * browser wipe cannot resurrect a stale file.
 */
export async function loadStateSmart(): Promise<AppState> {
  const server = await fetchServerState();
  const rawLocal = localStorage.getItem(STORAGE_KEY);
  const localSavedAt = localStorage.getItem(SAVED_AT_KEY) ?? '';

  if (!server) return loadState();
  if (rawLocal === null || server.savedAt >= localSavedAt) return server.state;

  // localStorage is newer: keep it and push it to disk right away.
  const state = loadState();
  void pushToServer(JSON.stringify(state), localSavedAt);
  return state;
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;
let lastPushedJson = '';

function pushToServer(json: string, savedAt: string): void {
  if (json === lastPushedJson) return;
  lastPushedJson = json;
  void fetch(SERVER_STATE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    // Re-parse so the file always holds a well-formed { savedAt, state }.
    body: JSON.stringify({ savedAt, state: JSON.parse(json) }),
  }).catch(() => {
    // Server down or dev mode without the API: localStorage still holds the data.
    lastPushedJson = '';
  });
}

function scheduleServerPush(json: string, savedAt: string): void {
  if (json === lastPushedJson) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushToServer(json, savedAt), SERVER_PUSH_DEBOUNCE_MS);
}

/** Persist a change: instantly to localStorage, shortly after to disk. */
export function saveState(state: AppState): void {
  const json = JSON.stringify(state);
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(SAVED_AT_KEY, savedAt);
  } catch {
    // Private mode / quota: the server push below becomes the only copy.
  }
  scheduleServerPush(json, savedAt);
}

/** Stable-enough unique id for events and categories. */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
