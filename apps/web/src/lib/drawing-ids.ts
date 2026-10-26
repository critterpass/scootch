let drawn = 0;

/**
 * Readies an inline drawing: its ids become its own, so two drawings on one page never share a
 * clip, and it is labelled for screen readers, or hidden from them when it has no label.
 */
export function drawingIds(svg: string, label: string): string {
  drawn += 1;
  const own = `d${drawn}-`;
  const named = label.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  return svg
    .replace(/id="([^"]+)"/g, `id="${own}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${own}$1)`)
    .replace(
      '<svg ',
      label === ''
        ? '<svg aria-hidden="true" focusable="false" '
        : `<svg role="img" aria-label="${named}" `,
    );
}
