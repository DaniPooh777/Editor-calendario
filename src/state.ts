/** App state: single source of truth, persisted to localStorage. */

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface CalendarEvent {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  /** Free text like "9:00". Optional. */
  time?: string;
  color: string;
}

export interface AppState {
  year: number;
  monthIndex: number;
  season: 'primavera' | 'verano' | 'otono' | 'invierno';
  /** Current brush color; '' means no color selected. */
  brushColor: string;
  categories: Category[];
  events: CalendarEvent[];
  notes: string;
}

const STORAGE_KEY = 'editor-calendario-v1';

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
    notes: '',
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      // Guard shapes that come from storage.
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      brushColor: typeof parsed.brushColor === 'string' ? parsed.brushColor : base.brushColor,
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Stable-enough unique id for events and categories. */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
