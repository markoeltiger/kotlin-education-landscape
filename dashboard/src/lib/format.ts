export const nf = new Intl.NumberFormat("en-US");
export const fmt = (n: number) => nf.format(n);
export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

export function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
