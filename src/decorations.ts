/** Pastel seasonal decorations rendered behind the calendar content. */

import type { AppState } from './state';

type Season = AppState['season'];
type ShapeFn = (color: string) => string;

/** A maple-ish leaf. */
const leaf: ShapeFn = (color) =>
  `<svg viewBox="0 0 32 32"><path d="M16 3 C10 10 6 15 6 21 a10 10 0 0 0 20 0 c0-6-4-11-10-18z" fill="${color}"/><path d="M16 7 v19" stroke="rgba(60,50,40,0.18)" stroke-width="1.2"/></svg>`;

/** Narrow elongated leaf. */
const leafNarrow: ShapeFn = (color) =>
  `<svg viewBox="0 0 32 32"><path d="M16 3 C13 9 11 14 11 20 c0 4 2.4 7 5 9 c2.6-2 5-5 5-9 c0-6-2-11-5-17z" fill="${color}"/><path d="M16 6 v20" stroke="rgba(60,50,40,0.16)" stroke-width="1.1"/></svg>`;

/** Soft round blob (snowball / berry / petal). */
const blob: ShapeFn = (color) =>
  `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="9" fill="${color}" opacity="0.85"/></svg>`;

/** Six-branch snowflake. */
const snowflake: ShapeFn = (color) =>
  `<svg viewBox="0 0 32 32" stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none">
    <line x1="16" y1="4" x2="16" y2="28"/>
    <line x1="5.6" y1="10" x2="26.4" y2="22"/>
    <line x1="5.6" y1="22" x2="26.4" y2="10"/>
    <line x1="16" y1="8" x2="12.5" y2="11.5"/>
    <line x1="16" y1="8" x2="19.5" y2="11.5"/>
    <line x1="16" y1="24" x2="12.5" y2="20.5"/>
    <line x1="16" y1="24" x2="19.5" y2="20.5"/>
  </svg>`;

/** Simple frost asterisk. */
const frost: ShapeFn = (color) =>
  `<svg viewBox="0 0 32 32" stroke="${color}" stroke-width="2.2" stroke-linecap="round" fill="none">
    <line x1="16" y1="5" x2="16" y2="27"/>
    <line x1="6.5" y1="10.5" x2="25.5" y2="21.5"/>
    <line x1="6.5" y1="21.5" x2="25.5" y2="10.5"/>
  </svg>`;

/** Five-petal flower. */
const flower: ShapeFn = (color) =>
  `<svg viewBox="0 0 32 32">
    <circle cx="16" cy="8" r="5" fill="${color}"/>
    <circle cx="24" cy="14.5" r="5" fill="${color}"/>
    <circle cx="21" cy="23.5" r="5" fill="${color}"/>
    <circle cx="11" cy="23.5" r="5" fill="${color}"/>
    <circle cx="8" cy="14.5" r="5" fill="${color}"/>
    <circle cx="16" cy="16" r="4.5" fill="#f5e0a0"/>
  </svg>`;

/** Three-petal cluster. */
const petals: ShapeFn = (color) =>
  `<svg viewBox="0 0 32 32">
    <circle cx="11" cy="13" r="5.5" fill="${color}"/>
    <circle cx="21" cy="13" r="5.5" fill="${color}"/>
    <circle cx="16" cy="21" r="5.5" fill="${color}"/>
  </svg>`;

/** Sun with rays. */
const sun: ShapeFn = (color) =>
  `<svg viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="7" fill="${color}"/>
    <g stroke="${color}" stroke-width="2.4" stroke-linecap="round">
      <line x1="16" y1="2.5" x2="16" y2="6.5"/>
      <line x1="16" y1="25.5" x2="16" y2="29.5"/>
      <line x1="2.5" y1="16" x2="6.5" y2="16"/>
      <line x1="25.5" y1="16" x2="29.5" y2="16"/>
      <line x1="6.5" y1="6.5" x2="9.3" y2="9.3"/>
      <line x1="22.7" y1="22.7" x2="25.5" y2="25.5"/>
      <line x1="6.5" y1="25.5" x2="9.3" y2="22.7"/>
      <line x1="22.7" y1="9.3" x2="25.5" y2="6.5"/>
    </g>
  </svg>`;

/** Pastel ring (sun / bubble). */
const ring: ShapeFn = (color) =>
  `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="9" fill="none" stroke="${color}" stroke-width="3.2"/></svg>`;

interface SeasonDef {
  shapes: ShapeFn[];
  palette: string[];
}

/** Three shapes cycle per season; 9-color pastel palette each. */
const SEASON_DEFS: Record<Season, SeasonDef> = {
  primavera: {
    shapes: [flower, petals, blob],
    palette: ['#efb7c8', '#e8b4d4', '#bcd9c0', '#f3c9a8', '#f0c4d8', '#cfe3c8', '#e6c3e0', '#d9e8c9', '#f5d3c8'],
  },
  verano: {
    shapes: [sun, ring, blob],
    palette: ['#f0d48a', '#f2c96b', '#e8d9a8', '#f5dfb0', '#efd09a', '#f7e6b8', '#f4c98a', '#e9e0a5', '#f8e9c0'],
  },
  otono: {
    shapes: [leaf, leafNarrow, blob],
    palette: ['#d99a6c', '#c4784a', '#a8b894', '#e0b88a', '#c98d68', '#a9b88a', '#b97e55', '#8fa87c', '#dcae7f'],
  },
  invierno: {
    shapes: [snowflake, frost, blob],
    palette: ['#a9c7dd', '#e8f2fa', '#c5dcec', '#d4e6f2', '#8fb4cf', '#eef6fb', '#bcd6e8', '#dfeaf5', '#9dbdd6'],
  },
};

/**
 * Eighteen fixed slots (percent of capture area) spread across the WHOLE
 * calendar, not just the borders: bigger sizes with generous spacing and
 * softer opacity so the overlay never saturates the content underneath.
 */
const SLOTS: ReadonlyArray<{ x: number; y: number; rot: number; size: number; op: number }> = [
  { x: 6, y: 5, rot: -18, size: 54, op: 0.48 },
  { x: 30, y: 3, rot: 12, size: 42, op: 0.4 },
  { x: 52, y: 6, rot: -6, size: 48, op: 0.44 },
  { x: 74, y: 3, rot: 22, size: 40, op: 0.38 },
  { x: 92, y: 7, rot: 28, size: 56, op: 0.5 },
  { x: 14, y: 24, rot: 8, size: 46, op: 0.42 },
  { x: 38, y: 20, rot: -20, size: 58, op: 0.46 },
  { x: 62, y: 26, rot: 16, size: 44, op: 0.38 },
  { x: 86, y: 22, rot: -12, size: 52, op: 0.44 },
  { x: 8, y: 46, rot: 24, size: 50, op: 0.42 },
  { x: 56, y: 44, rot: -8, size: 60, op: 0.48 },
  { x: 80, y: 50, rot: 18, size: 42, op: 0.38 },
  { x: 18, y: 70, rot: -16, size: 54, op: 0.45 },
  { x: 44, y: 74, rot: 10, size: 46, op: 0.4 },
  { x: 68, y: 68, rot: 26, size: 52, op: 0.46 },
  { x: 90, y: 74, rot: -22, size: 44, op: 0.4 },
  { x: 24, y: 92, rot: 20, size: 50, op: 0.44 },
  { x: 58, y: 91, rot: -14, size: 48, op: 0.42 },
];

/** Render the pastel decorations for the current season. */
export function renderDecorations(season: Season): void {
  const container = document.getElementById('season-decor');
  if (!container) return;

  const def = SEASON_DEFS[season] ?? SEASON_DEFS.otono;
  container.innerHTML = SLOTS.map((slot, i) => {
    const shape = def.shapes[i % def.shapes.length];
    const color = def.palette[i % def.palette.length];
    const style =
      `left:${slot.x}%;top:${slot.y}%;` +
      `width:${slot.size}px;height:${slot.size}px;` +
      `opacity:${slot.op};transform:rotate(${slot.rot}deg)`;
    return `<span class="deco" style="${style}">${shape(color)}</span>`;
  }).join('');
}
