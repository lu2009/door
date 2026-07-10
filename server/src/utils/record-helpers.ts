/**
 * Pure data-manipulation helpers shared across services and legacy-dispatch.
 *
 * These functions have NO knowledge of HTTP, field-name aliases, or the
 * legacy /1 adapter. They are purely about JSON record wrangling, Chinese
 * progress-text construction, and the date-label translation that the
 * frontend sends.
 */

// ── Type guards ──

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function hasBodyKeys(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length > 0;
}

// ── Value coercion ──

/** First argument whose trimmed string form is non-empty. */
export function firstPresent(...values: unknown[]): unknown {
  return values.find(
    (value) =>
      value !== null && value !== undefined && String(value).trim() !== '',
  );
}

/** Like firstPresent but returns undefined instead of the whole array. */
export function firstNonBlank(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== '')
      return value;
  }
  return undefined;
}

export function numberValue(value: unknown, fallback = 0): number {
  const num =
    typeof value === 'string' ? Number(value) : Number(value || fallback);
  return Number.isFinite(num) ? num : fallback;
}

export function dateText(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

// ── JSON / record helpers ──

export function parseJsonRecord(
  value: unknown,
): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function asRecordArray(
  value: unknown,
): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
}

// ── Door-specs helpers (operate on stored JSON, not request fields) ──

export function doorRowsFromSpecs(
  specs: Record<string, unknown>,
): Record<string, unknown>[] {
  return [
    ...asRecordArray(specs.ping_hui ?? specs['平开']),
    ...asRecordArray(specs.diao_hui ?? specs['吊滑']),
  ];
}

export function buildReceiptNoSet(
  specs: Record<string, unknown>,
  customerInfo?: Record<string, unknown>,
): string {
  const ci = customerInfo ?? parseJsonRecord(specs.customerInfo);
  const lineNos = doorRowsFromSpecs(specs)
    .map((row) => row['单号'])
    .filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== '',
    )
    .map((value) => String(value).trim());
  const unique = [...new Set(lineNos)];
  if (unique.length > 0) return unique.join('_');
  const existing = ci['单号集'];
  return existing !== null && existing !== undefined
    ? String(existing).trim()
    : '';
}

export function buildProgressText(
  row: Record<string, unknown>,
): string {
  const parts: string[] = [];
  for (let i = 1; i <= 15; i++) {
    const value = row[`工序${i}`];
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    ) {
      parts.push(String(value).trim());
    }
  }
  return parts.join('➞');
}

export function isProcedureSlot(value: string): boolean {
  return /^工序\d+$/.test(value.trim());
}

// ── Frontend date-label translation ──

/**
 * Translate frontend date-range labels ("当天"/"本周"/"本月") into
 * comma-separated ISO date strings.
 */
export function resolveDateLabel(label: string): string {
  const today = new Date();
  const fy = today.getFullYear();
  const fm = String(today.getMonth() + 1).padStart(2, '0');
  const fd = String(today.getDate()).padStart(2, '0');
  const ds = `${fy}-${fm}-${fd}`;

  switch (label) {
    case '当天':
      return `${ds},${ds}`;
    case '本周': {
      const dw = today.getDay() || 7;
      const mon = new Date(today);
      mon.setDate(today.getDate() - dw + 1);
      const wy = mon.getFullYear();
      const wm = String(mon.getMonth() + 1).padStart(2, '0');
      const wd = String(mon.getDate()).padStart(2, '0');
      return `${wy}-${wm}-${wd},${ds}`;
    }
    case '本月':
      return `${fy}-${fm}-01,${ds}`;
    default:
      return label;
  }
}
