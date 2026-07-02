// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeLoads(val: any, defaultVal: any = {}): any {
  if (val === null || val === undefined || val === '') return defaultVal;
  if (typeof val === 'object') return val;
  if (typeof val !== 'string') return defaultVal;
  try {
    return JSON.parse(val);
  } catch {
    return defaultVal;
  }
}

export function toFloat(val: unknown, defaultVal = 0): number {
  if (val === null || val === undefined) return defaultVal;
  const n = Number(val);
  return isNaN(n) ? defaultVal : n;
}

export function isBlank(val: unknown): boolean {
  return val === null || val === undefined || val === '';
}

export function firstPresent(data: Record<string, unknown>, ...keys: string[]): unknown {
  if (!data || typeof data !== 'object') return null;
  for (const key of keys) {
    const val = data[key];
    if (val !== null && val !== undefined && val !== '') return val;
  }
  return null;
}

export function parseDate(val: unknown): string | null {
  if (!val) return null;
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

export function generateOrderNo(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DD${date}${rand}`;
}

export function paginate(page: number, perPage: number) {
  const p = Math.max(1, page);
  const pp = Math.min(100, Math.max(1, perPage));
  return { skip: (p - 1) * pp, take: pp, page: p, perPage: pp };
}
