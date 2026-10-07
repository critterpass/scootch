/** `steps` points of a CSS cubic bezier from 0 to `upTo`: the times and how far along each is. */
export function easedRun(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  upTo: number,
  steps: number,
): { readonly times: number[]; readonly along: number[] } {
  const axis = (s: number, a: number, b: number) =>
    3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
  const times: number[] = [];
  const along: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const time = (upTo * i) / steps;
    let low = 0;
    let high = 1;
    for (let pass = 0; pass < 40; pass++) {
      const middle = (low + high) / 2;
      if (axis(middle, x1, x2) < time) low = middle;
      else high = middle;
    }
    times.push(time);
    along.push(axis((low + high) / 2, y1, y2));
  }
  return { times, along };
}
