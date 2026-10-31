/** Pastel seasonal decorations rendered behind the calendar content. */

import type { AppState } from './state';

type Season = AppState['season'];
type ShapeFn = (color: string) => string;

/** A maple-ish leaf. */
const leaf: ShapeFn = (color) =>
  `<svg viewBox="0 0 32 32"><path d="M16 3 C10 10 6 15 6 21 a10 10 0 0 0 20 0 c0-6-4-11-10-18z" fill="${color}"/><path d="M16 7 v19" stroke="rgba(60,50,40,0.18)" stroke-width="1.2"/></svg>`;

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

interface SeasonDef {
  shapes: ShapeFn[];
  palette: string[];
}

/** Main shape alternates with a soft blob; pastel palette per season. */
const SEASON_DEFS: Record<Season, SeasonDef> = {
  primavera: {
    shapes: [flower, blob],
    palette: ['#efb7c8', '#e8b4d4', '#bcd9c0', '#f3c9a8', '#f0c4d8', '#cfe3c8'],
  },
  verano: {
    shapes: [sun, blob],
    palette: ['#f0d48a', '#f2c96b', '#e8d9a8', '#f5dfb0', '#efd09a', '#f7e6b8'],
  },
  otono: {
    shapes: [leaf, blob],
    palette: ['#d99a6c', '#c4784a', '#a8b894', '#e0b88a', '#c98d68', '#a9b88a'],
  },
  invierno: {
    shapes: [snowflake, blob],
    palette: ['#a9c7dd', '#e8f2fa', '#c5dcec', '#d4e6f2', '#8fb4cf', '#eef6fb'],
  },
};

/** Fixed slots (percent of capture area): edges only, never the text center. */
const SLOTS: ReadonlyArray<{ x: number; y: number; rot: number; scale: number }> = [
  { x: 2, y: 3, rot: -18, scale: 1.0 },
  { x: 46, y: 2, rot: 14, scale: 0.7 },
  { x: 91, y: 4, rot: 24, scale: 1.05 },
  { x: 1.5, y: 42, rot: 12, scale: 0.75 },
  { x: 95, y: 36, rot: -14, scale: 0.85 },
  { x: 2.5, y: 88, rot: 28, scale: 0.95 },
  { x: 48, y: 94, rot: -22, scale: 0.65 },
  { x: 92, y: 86, rot: 8, scale: 1.0 },
];

/** Render the pastel decorations for the current season. */
export function renderDecorations(season: Season): void {
  const container = document.getElementById('season-decor');
  if (!container) return;

  const def = SEASON_DEFS[season] ?? SEASON_DEFS.otono;
  container.innerHTML = SLOTS.map((slot, i) => {
    const shape = def.shapes[i % def.shapes.length];
    const color = def.palette[i % def.palette.length];
    const style = `left:${slot.x}%;top:${slot.y}%;transform:rotate(${slot.rot}deg) scale(${slot.scale})`;
    return `<span class="deco" style="${style}">${shape(color)}</span>`;
  }).join('');
}
