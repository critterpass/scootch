const channel = (hex: string, index: number): number =>
  parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);

/** A six-digit hex colour at a strength, as the CSS colour every backend reads. */
export function rgba(hex: string, alpha: number): string {
  return `rgba(${channel(hex, 0)},${channel(hex, 1)},${channel(hex, 2)},${Math.round(alpha * 1000) / 1000})`;
}
