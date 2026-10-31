/** Capture the calendar as a clean professional image (no editor UI). */

import { toPng } from 'html-to-image';

/**
 * Render #capture-area to PNG without editor-only controls
 * (hidden via .export-mode + [data-export-exclude]), then copy to
 * the clipboard. Falls back to downloading a PNG file when the
 * browser blocks clipboard image writes.
 */
export async function copyCalendarImage(): Promise<'clipboard' | 'download'> {
  const node = document.getElementById('capture-area');
  if (!node) throw new Error('Missing #capture-area');

  document.body.classList.add('export-mode');
  try {
    const backgroundColor = getComputedStyle(node).backgroundColor || '#f7f3ea';
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor,
    });

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return 'clipboard';
    } catch {
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.download = `calendario-${stamp}.png`;
      link.href = dataUrl;
      link.click();
      return 'download';
    }
  } finally {
    document.body.classList.remove('export-mode');
  }
}
